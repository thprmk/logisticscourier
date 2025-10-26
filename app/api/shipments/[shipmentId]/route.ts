// app/api/shipments/[shipmentId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shipment from '@/models/Shipment.model';
import { jwtVerify } from 'jose';

// Helper to get user payload (Your existing function, no changes)
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

// Helper to get the ID from the URL (The reliable method for your setup)
function getShipmentIdFromUrl(url: string) {
    const pathParts = new URL(url).pathname.split('/');
    return pathParts[pathParts.length - 1];
}


// GET a single shipment
export async function GET(request: NextRequest) {
    await dbConnect();
    try {
        const payload = await getUserPayload(request);
        if (!payload) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        
        // FIX: Use the reliable URL parsing method
        const shipmentId = getShipmentIdFromUrl(request.url);

        const shipment = await Shipment.findOne({ _id: shipmentId, tenantId: payload.tenantId }).populate('assignedTo', 'name');
        if (!shipment) {
            return NextResponse.json({ message: "Shipment not found or access denied" }, { status: 404 });
        }
        return NextResponse.json(shipment, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}


// PATCH to update a shipment
export async function PATCH(request: NextRequest) {
  await dbConnect();
  
  const payload = await getUserPayload(request);
  if (!payload || !payload.tenantId || payload.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized or Forbidden' }, { status: 403 });
  }

  try {
    // FIX: Use the reliable URL parsing method
    const shipmentId = getShipmentIdFromUrl(request.url);
    const body = await request.json();
    const { status, assignedTo, notes } = body;

    const shipment = await Shipment.findOne({ _id: shipmentId, tenantId: payload.tenantId });

    if (!shipment) {
      return NextResponse.json({ message: 'Shipment not found or access denied.' }, { status: 404 });
    }
    
    if (assignedTo !== undefined) { shipment.assignedTo = assignedTo; }

    if (status && status !== shipment.status) {
      shipment.status = status;
      const newHistoryEntry = { status: status, timestamp: new Date(), notes: notes || `Status updated to ${status}` };
      shipment.statusHistory.unshift(newHistoryEntry);
    }
    
    await shipment.save();

    return NextResponse.json(shipment, { status: 200 });

  } catch (error) {
    console.error("Update Shipment Error:", error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE a shipment
export async function DELETE(request: NextRequest) {
  await dbConnect();

  const payload = await getUserPayload(request);
  if (!payload || !payload.tenantId || payload.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized or Forbidden' }, { status: 403 });
  }

  try {
    // FIX: Use the reliable URL parsing method
    const shipmentId = getShipmentIdFromUrl(request.url);

    const deletedShipment = await Shipment.findOneAndDelete({
      _id: shipmentId,
      tenantId: payload.tenantId,
    });

    if (!deletedShipment) {
      return NextResponse.json({ message: "Shipment not found or access denied" }, { status: 404 });
    }

    return NextResponse.json({ message: "Shipment cancelled successfully" }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
} 