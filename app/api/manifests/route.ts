// app/api/manifests/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Manifest from '@/models/Manifest.model';
import Shipment from '@/models/Shipment.model';
import Tenant from '@/models/Tenant.model';
import { jwtVerify } from 'jose';
import { sanitizeInput } from '@/lib/sanitize';
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

// GET: Fetch manifests (with filtering and pagination options)
export async function GET(request: NextRequest) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload || !payload.tenantId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'incoming' or 'outgoing'
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    let query: any = {};

    // Filter by type (incoming/outgoing relative to the current branch)
    if (type === 'incoming') {
      query.toBranchId = payload.tenantId;
    } else if (type === 'outgoing') {
      query.fromBranchId = payload.tenantId;
    }

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Get total count for pagination
    const total = await Manifest.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const manifests = await Manifest.find(query)
      .populate('fromBranchId', 'name')
      .populate('toBranchId', 'name')
      .sort({ dispatchedAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      data: manifests,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching manifests:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new manifest (dispatch shipments)
export async function POST(request: NextRequest) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload || !payload.tenantId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can create manifests
  if (payload.role !== 'admin' && payload.role !== 'superAdmin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { toBranchId, shipmentIds, vehicleNumber, driverName, notes } = body;

    // Sanitize string inputs to prevent XSS
    const sanitizedVehicleNumber = vehicleNumber ? sanitizeInput(vehicleNumber, 50) : undefined;
    const sanitizedDriverName = driverName ? sanitizeInput(driverName, 100) : undefined;
    const sanitizedNotes = notes ? sanitizeInput(notes, 500) : undefined;

    // Validate required fields
    if (!toBranchId || !shipmentIds || !Array.isArray(shipmentIds) || shipmentIds.length === 0) {
      return NextResponse.json(
        { message: 'Invalid request: toBranchId and non-empty shipmentIds array required' },
        { status: 400 }
      );
    }

    // Verify all shipments exist and belong to the origin branch
    const shipments = await Shipment.find({
      _id: { $in: shipmentIds },
      currentBranchId: payload.tenantId,
      status: 'At Origin Branch',
    });

    if (shipments.length !== shipmentIds.length) {
      return NextResponse.json(
        { message: 'Some shipments do not exist, are not at the origin branch, or have incorrect status' },
        { status: 400 }
      );
    }

    // Create the manifest with sanitized data
    const manifest = new Manifest({
      fromBranchId: payload.tenantId,
      toBranchId,
      shipmentIds,
      vehicleNumber: sanitizedVehicleNumber,
      driverName: sanitizedDriverName,
      notes: sanitizedNotes,
      status: 'In Transit',
      dispatchedAt: new Date(),
    });

    await manifest.save();

    // Update all shipments to "In Transit to Destination"
    await Shipment.updateMany(
      { _id: { $in: shipmentIds } },
      {
        status: 'In Transit to Destination',
        $push: {
          statusHistory: {
            status: 'In Transit to Destination' as const,
            timestamp: new Date(),
            notes: `Dispatched via Manifest ${manifest._id.toString()}`,
          } as any,
        },
      } as any
    );

    // 👇 FIX: Get branch names for notification messages
    const fromBranch = await Tenant.findById(payload.tenantId).select('name').lean();
    const toBranchDoc = await Tenant.findById(toBranchId).select('name').lean();

    // Dispatch 'manifest_dispatched' notification to DESTINATION branch
    await dispatchNotification({
      event: 'manifest_dispatched',
      manifestId: manifest._id.toString(),
      trackingId: manifest._id.toString(),
      tenantId: toBranchId,  // 👈 DESTINATION branch gets notified
      fromBranch: fromBranch?.name || 'Origin',
      toBranch: toBranchDoc?.name || 'Destination',
      createdBy: payload.userId || payload.id || payload.sub,
    } as any).catch(err => {
      console.error('Error dispatching manifest_dispatched notification:', err);
    });

    return NextResponse.json(manifest, { status: 201 });
  } catch (error: any) {
    console.error('Error creating manifest:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
