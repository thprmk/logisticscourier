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
  if (!payload || !payload.tenantId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    // FIX: Use the reliable URL parsing method
    const shipmentId = getShipmentIdFromUrl(request.url);
    const body = await request.json();
    const { status, assignedTo, notes, failureReason } = body;

    // Find the shipment
    const shipment = await Shipment.findOne({ _id: shipmentId, tenantId: payload.tenantId });

    if (!shipment) {
      return NextResponse.json({ message: 'Shipment not found or access denied.' }, { status: 404 });
    }
    
    // Check permissions:
    // 1. Admins can update any shipment
    // 2. Delivery staff can only update shipments assigned to them
    if (payload.role !== 'admin' && (!shipment.assignedTo || shipment.assignedTo.toString() !== payload.userId)) {
      return NextResponse.json({ message: 'Unauthorized or Forbidden' }, { status: 403 });
    }
    
    // Update assignedTo if provided (only admins can do this)
    if (assignedTo !== undefined) {
      if (payload.role === 'admin') {
        shipment.assignedTo = assignedTo;
        // If assigning to a driver and current status is 'Pending', update status to 'Assigned'
        if (assignedTo && shipment.status === 'Pending') {
          shipment.status = 'Assigned';
          const newHistoryEntry = { 
            status: 'Assigned', 
            timestamp: new Date(), 
            notes: 'Shipment assigned to driver'
          };
          shipment.statusHistory.unshift(newHistoryEntry);
        }
        // If unassigning and current status is 'Assigned', update status back to 'Pending'
        else if (!assignedTo && shipment.status === 'Assigned') {
          shipment.status = 'Pending';
          const newHistoryEntry = { 
            status: 'Pending', 
            timestamp: new Date(), 
            notes: 'Shipment unassigned from driver'
          };
          shipment.statusHistory.unshift(newHistoryEntry);
        }
      } else {
        return NextResponse.json({ message: 'Only admins can reassign shipments' }, { status: 403 });
      }
    }

    // Update status if provided
    if (status && status !== shipment.status) {
      // Delivery staff can only update to specific statuses
      if (payload.role !== 'admin') {
        const validStatusTransitions: Record<string, string[]> = {
          'Assigned': ['Out for Delivery'],
          'Out for Delivery': ['Delivered', 'Failed']
        };
        
        if (!validStatusTransitions[shipment.status] || !validStatusTransitions[shipment.status]?.includes(status)) {
          return NextResponse.json({ message: `Cannot update status from ${shipment.status} to ${status}` }, { status: 403 });
        }
      }
      
      shipment.status = status;
      const newHistoryEntry = { 
        status: status, 
        timestamp: new Date(), 
        notes: notes || `Status updated to ${status}` 
      };
      
      // Add failure reason if provided
      if (failureReason) {
        newHistoryEntry.notes += ` - Reason: ${failureReason}`;
      }
      
      shipment.statusHistory.unshift(newHistoryEntry);
      
      // Add failure reason to shipment if provided
      if (failureReason) {
        shipment.failureReason = failureReason;
      }
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