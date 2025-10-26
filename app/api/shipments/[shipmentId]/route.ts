// app/api/shipments/[shipmentId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shipment from '@/models/Shipment.model';
import { jwtVerify } from 'jose';

// Helper to get user payload
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

// PATCH method to update a shipment (e.g., assign a driver)
export async function PATCH(
  request: NextRequest,
  context: { params: { shipmentId: string } } // Using the standard 'context' object
) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload || !payload.tenantId || payload.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized or Forbidden' }, { status: 403 });
  }

 try {
    // --- THIS IS THE NEW STRATEGY ---
    // Manually extract the ID from the URL pathname
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    // The URL is /api/shipments/SHIPMENT_ID, so the ID is the last part
    const shipmentId = pathParts[pathParts.length - 1]; 
    // --- END OF NEW STRATEGY ---

    const { driverId } = await request.json();

    if (!driverId) {
      return NextResponse.json({ message: 'Driver ID is required for assignment.' }, { status: 400 });
    }
    
    if (!shipmentId) {
       return NextResponse.json({ message: 'Shipment ID not found in URL.' }, { status: 400 });
    }

    const shipment = await Shipment.findOne({
      _id: shipmentId,
      tenantId: payload.tenantId,
    });

    if (!shipment) {
      return NextResponse.json({ message: 'Shipment not found or access denied.' }, { status: 404 });
    }

    shipment.assignedTo = driverId;
    shipment.status = 'Assigned';
    shipment.statusHistory.push({
      status: 'Assigned',
      timestamp: new Date(),
    });

    await shipment.save();

    return NextResponse.json(shipment);

  } catch (error) {
    console.error("Update Shipment Error:", error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}