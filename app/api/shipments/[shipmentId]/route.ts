// app/api/shipments/[shipmentId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shipment from '@/models/Shipment.model';
import Notification from '@/models/Notification.model';
import User from '@/models/User.model';
import { jwtVerify } from 'jose';
import { sendShipmentNotification } from '@/app/lib/notifications';

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
    const { status, assignedTo, notes, failureReason, deliveryProof } = body;

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
        const previousAssignedTo = shipment.assignedTo;
        shipment.assignedTo = assignedTo;
        
    // If assigning to a driver and current status is 'Pending' or 'At Destination Branch', update status to 'Assigned'
        if (assignedTo && (shipment.status === 'Pending' || shipment.status === 'At Destination Branch')) {
          shipment.status = 'Assigned';
          const newHistoryEntry = { 
            status: 'Assigned', 
            timestamp: new Date(), 
            notes: 'Shipment assigned to driver'
          };
          shipment.statusHistory.unshift(newHistoryEntry);
          
          // Create notification for delivery staff
          if (assignedTo) {
            try {
              const driver = await User.findById(assignedTo).select('name');
              console.log('Creating notification for driver:', assignedTo);
              console.log('Tenant ID:', payload.tenantId);
              console.log('Shipment ID:', shipment._id);
              console.log('Tracking ID:', shipment.trackingId);
              
              const notificationData = {
                tenantId: payload.tenantId,
                userId: assignedTo,
                type: 'assignment' as const,
                shipmentId: shipment._id,
                trackingId: shipment.trackingId,
                message: `New delivery assigned to you - ${shipment.trackingId}`,
                read: false,
              };
              
              const notification = await Notification.create(notificationData);
              console.log('Notification created successfully:', notification._id);
              
              // Send push notification to delivery staff
              await sendShipmentNotification(
                assignedTo.toString(),
                shipment._id.toString(),
                shipment.trackingId,
                'Assigned',
                'assignment'
              ).catch(err => {
                console.error('Error sending push notification:', err);
              });
            } catch (notifError) {
              console.error('Error creating notification:', notifError);
            }
          }
        }
        // If unassigning and current status is 'Assigned', update status back to original state
        else if (!assignedTo && shipment.status === 'Assigned') {
          // If it was from a branch transfer, go back to 'At Destination Branch'
          // Otherwise, go back to 'Pending' for locally created shipments
          const destinationStatus = shipment.destinationBranchId.toString() !== shipment.originBranchId.toString() 
            ? 'At Destination Branch' 
            : 'Pending';
          shipment.status = destinationStatus;
          const newHistoryEntry = { 
            status: destinationStatus, 
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
      const previousStatus = shipment.status;
      
      // Delivery staff can only update to specific statuses
      if (payload.role !== 'admin') {
        const validStatusTransitions: Record<string, string[]> = {
          'Assigned': ['Out for Delivery'],
          'At Destination Branch': ['Assigned'], // Allow direct assignment at destination
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
      
      // Add delivery proof if provided
      if (deliveryProof) {
        shipment.deliveryProof = {
          type: deliveryProof.type,
          url: deliveryProof.url
        };
      }
      
      // Create notification for branch admin when delivery staff updates status
      if (payload.role === 'staff' && shipment.assignedTo?.toString() === payload.userId) {
        // Find the branch admin(s) for this tenant
        const admins = await User.find({ tenantId: payload.tenantId, role: 'admin' }).select('_id');
        
        // Create notifications for all admins of this branch
        const notifications = admins.map(admin => ({
          tenantId: payload.tenantId,
          userId: admin._id,
          type: 'status_update',
          shipmentId: shipment._id,
          trackingId: shipment.trackingId,
          message: `Delivery ${shipment.trackingId} updated to ${status}`,
          read: false,
        }));
        
        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
          
          // Send push notifications to all admins
          for (const notification of notifications) {
            await sendShipmentNotification(
              notification.userId.toString(),
              shipment._id.toString(),
              shipment.trackingId,
              status,
              'status_update'
            ).catch(err => {
              console.error('Error sending push notification to admin:', err);
            });
          }
        }
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