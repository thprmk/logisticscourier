import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shipment from '@/models/Shipment.model';
import User from '@/models/User.model';
import { jwtVerify } from 'jose';
import { dispatchNotification } from '@/app/lib/notificationDispatcher';
import { sanitizeInput } from '@/lib/sanitize';

// Helper to get user payload (Your existing function, no changes)
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

        const shipment = await Shipment.findOne({ _id: shipmentId, tenantId: payload.tenantId }).populate('assignedTo', 'name').populate('createdBy', 'name');
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
    const { status, assignedTo, notes, failureReason, deliveryProof } = body;

    // Sanitize string inputs to prevent XSS
    const sanitizedNotes = notes ? sanitizeInput(notes, 500) : undefined;
    const sanitizedFailureReason = failureReason ? sanitizeInput(failureReason, 500) : undefined;

    // Find the shipment
    const shipment = await Shipment.findOne({ _id: shipmentId, tenantId: payload.tenantId }).populate('createdBy', '_id name');

    if (!shipment) {
      return NextResponse.json({ message: 'Shipment not found or access denied.' }, { status: 404 });
    }
    
    // Check permissions based on role:
    // - Admins can only update their own created shipments
    // - Delivery staff (role='staff') can update if assigned to them
    if (payload.role === 'admin') {
      // Admin: must be the creator
      if (shipment.createdBy && shipment.createdBy._id.toString() !== payload.userId) {
        return NextResponse.json({ message: 'Only the creator can update this shipment.' }, { status: 403 });
      }
    } else if (payload.role === 'staff') {
      // Delivery staff: must be assigned to this shipment
      if (!shipment.assignedTo || shipment.assignedTo.toString() !== payload.userId) {
        return NextResponse.json({ message: 'You are not assigned to this shipment.' }, { status: 403 });
      }
    } else {
      // Other roles cannot update
      return NextResponse.json({ message: 'You do not have permission to update this shipment.' }, { status: 403 });
    }
    
    // Update assignedTo if provided (only admins can do this)
    if (assignedTo !== undefined) {
      if (payload.role === 'admin') {
        const previousAssignedTo = shipment.assignedTo;
        const staffChanged = assignedTo !== previousAssignedTo;
        shipment.assignedTo = assignedTo;
        
        // If assigning to a staff and current status is 'Pending' or 'At Destination Branch', update status to 'Assigned'
        if (assignedTo && (shipment.status === 'Pending' || shipment.status === 'At Destination Branch')) {
          shipment.status = 'Assigned';
          const newHistoryEntry = { 
            status: 'Assigned', 
            timestamp: new Date(), 
            notes: 'Shipment assigned to delivery staff'
          };
          shipment.statusHistory.unshift(newHistoryEntry);
        }
        
        // Dispatch notification if staff assignment changed (either assigned or reassigned)
        if (assignedTo && staffChanged) {
          // Dispatch 'delivery_assigned' notification using the dispatcher
          console.log('[Shipment Assignment] Dispatching notification:', {
            assignedTo,
            assignedToType: typeof assignedTo,
            trackingId: shipment.trackingId,
            shipmentId: shipment._id,
            previousAssignedTo,
            staffChanged
          });
          
          await dispatchNotification({
            event: 'delivery_assigned',
            shipmentId: shipment._id.toString(),
            trackingId: shipment.trackingId,
            tenantId: payload.tenantId as string,
            assignedStaffId: assignedTo.toString(),
            createdBy: payload.userId as string,
          } as any).catch(err => {
            console.error('Error dispatching delivery_assigned notification:', err);
          });
        }
        // If unassigning and current status is 'Assigned', update status back to original state
        else if (!assignedTo && shipment.status === 'Assigned') {
          const destinationStatus = shipment.destinationBranchId.toString() !== shipment.originBranchId.toString() 
            ? 'At Destination Branch' 
            : 'Pending';
          shipment.status = destinationStatus;
          const newHistoryEntry = { 
            status: destinationStatus, 
            timestamp: new Date(), 
            notes: 'Shipment unassigned from delivery staff'
          };
          shipment.statusHistory.unshift(newHistoryEntry);
        }
      } else {
        return NextResponse.json({ message: 'Only admins can reassign shipments' }, { status: 403 });
      }
    }

    // Update status if provided
    if (status && status !== shipment.status) {
      const previousStatus = shipment.status;
      
      // Delivery staff can only update to specific statuses
      if (payload.role !== 'admin') {
        const validStatusTransitions: Record<string, string[]> = {
          'Assigned': ['Out for Delivery'],
          'At Destination Branch': ['Assigned'],
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
        shipment.failureReason = sanitizedFailureReason;
      }
      
      // Add delivery proof if provided
      if (deliveryProof) {
        shipment.deliveryProof = {
          type: deliveryProof.type,
          url: deliveryProof.url
        };
      }
      
      // Dispatch notification based on status change
      let notificationEvent: 'out_for_delivery' | 'delivered' | 'delivery_failed' | undefined;
      
      if (status === 'Out for Delivery') {
        notificationEvent = 'out_for_delivery';
      } else if (status === 'Delivered') {
        notificationEvent = 'delivered';
      } else if (status === 'Failed') {
        notificationEvent = 'delivery_failed';
      }
      
      if (notificationEvent) {
        await dispatchNotification({
          event: notificationEvent,
          shipmentId: shipment._id.toString(),
          trackingId: shipment.trackingId,
          tenantId: payload.tenantId as string,
          assignedStaffId: shipment.assignedTo?.toString(),
          createdBy: payload.userId as string,
        } as any).catch(err => {
          console.error(`Error dispatching ${notificationEvent} notification:`, err);
        });
      }
    }
    
    await shipment.save();
    
    console.log('Shipment saved successfully:', { 
      shipmentId: shipment._id, 
      status: shipment.status,
      deliveryProof: shipment.deliveryProof
    });

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

    // First, find the shipment with creator info
    const shipment = await Shipment.findOne({
      _id: shipmentId,
      tenantId: payload.tenantId,
    }).populate('createdBy', '_id name');

    if (!shipment) {
      return NextResponse.json({ message: "Shipment not found or access denied" }, { status: 404 });
    }

    // Check if user is the creator (only creator can delete)
    if (shipment.createdBy && shipment.createdBy._id.toString() !== payload.userId) {
      return NextResponse.json({ message: 'Only the creator can delete this shipment.' }, { status: 403 });
    }

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