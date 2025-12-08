// app/api/manifests/[manifestId]/receive/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Manifest from '@/models/Manifest.model';
import Shipment from '@/models/Shipment.model';
import Tenant from '@/models/Tenant.model';
import { jwtVerify } from 'jose';
import { dispatchNotification } from '@/app/lib/notificationDispatcher';

// Helper to get the logged-in user's payload from their token
async function getUserPayload(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as any;
  } catch (error) {
    return null;
  }
}

// PUT: Receive a manifest at the destination branch
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ manifestId: string }> }
) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload || !payload.tenantId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can receive manifests
  if (payload.role !== 'admin' && payload.role !== 'superAdmin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { manifestId } = await params;

    // Find the manifest
    const manifest = await Manifest.findById(manifestId);

    if (!manifest) {
      return NextResponse.json({ message: 'Manifest not found' }, { status: 404 });
    }

    // Verify that the current user is from the destination branch
    if (manifest.toBranchId.toString() !== payload.tenantId.toString()) {
      return NextResponse.json(
        { message: 'Forbidden: You can only receive manifests for your branch' },
        { status: 403 }
      );
    }

    // Verify the manifest is in "In Transit" status
    if (manifest.status !== 'In Transit') {
      return NextResponse.json(
        { message: 'Invalid manifest status: Can only receive manifests in "In Transit" status' },
        { status: 400 }
      );
    }

    // Update the manifest
    manifest.status = 'Completed';
    manifest.receivedAt = new Date();
    await manifest.save();

    // Update all shipments to "At Destination Branch"
    console.log('Updating shipments for manifest:', manifestId);
    console.log('Destination branch (tenantId):', payload.tenantId);
    console.log('Shipment IDs:', manifest.shipmentIds);
    
    const updateResult = await Shipment.updateMany(
      { _id: { $in: manifest.shipmentIds } },
      {
        $set: {
          status: 'At Destination Branch',
          currentBranchId: payload.tenantId,
          tenantId: payload.tenantId,
        },
        $push: {
          statusHistory: {
            status: 'At Destination Branch',
            timestamp: new Date(),
            notes: `Received via Manifest ${manifest._id.toString()}`,
          } as any,
        },
      } as any
    );
    
    console.log('Update result:', updateResult.modifiedCount, 'shipments updated');

    // Return updated manifest and the updated shipments
    const updatedShipments = await Shipment.find({ _id: { $in: manifest.shipmentIds } });
    console.log('Verified shipments after update:', updatedShipments.map(s => ({ id: s._id, status: s.status, tenantId: s.tenantId })));

    // 👇 FIX: Get destination branch name for notification
    const destinationBranch = await Tenant.findById(manifest.toBranchId).select('name').lean() as any;

    // Dispatch 'manifest_arrived' notification to ORIGIN branch
    await dispatchNotification({
      event: 'manifest_arrived',
      manifestId: manifest._id.toString(),
      trackingId: manifest._id.toString(),
      tenantId: manifest.fromBranchId,  // 👈 ORIGIN branch gets notified
      toBranch: destinationBranch?.name || 'Destination',
      createdBy: payload.userId || payload.id || payload.sub,
    } as any).catch(err => {
      console.error('Error dispatching manifest_arrived notification:', err);
    });

    return NextResponse.json({ manifest, updatedShipments });
  } catch (error: any) {
    console.error('Error receiving manifest:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
