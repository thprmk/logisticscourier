// app/api/admin/fix-shipment/route.ts
// TEMPORARY ENDPOINT - For fixing shipments with incorrect tenantId after manifest receipt

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shipment from '@/models/Shipment.model';
import { jwtVerify } from 'jose';

async function getUserPayload(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

// POST: Fix a shipment's tenantId based on currentBranchId
export async function POST(request: NextRequest) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { shipmentId } = body;

    if (!shipmentId) {
      return NextResponse.json(
        { message: 'shipmentId is required' },
        { status: 400 }
      );
    }

    // Find the shipment
    const shipment = await Shipment.findById(shipmentId);

    if (!shipment) {
      return NextResponse.json(
        { message: 'Shipment not found' },
        { status: 404 }
      );
    }

    const oldTenantId = shipment.tenantId;
    const newTenantId = shipment.currentBranchId;

    console.log(`Fixing shipment ${shipmentId}:`);
    console.log(`  Old tenantId: ${oldTenantId}`);
    console.log(`  New tenantId: ${newTenantId}`);

    // Update the shipment's tenantId to match currentBranchId
    shipment.tenantId = shipment.currentBranchId;
    await shipment.save();

    console.log(`  ✓ Fixed successfully`);

    return NextResponse.json({
      message: 'Shipment fixed',
      shipmentId,
      oldTenantId,
      newTenantId,
      shipment,
    });
  } catch (error: any) {
    console.error('Error fixing shipment:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
