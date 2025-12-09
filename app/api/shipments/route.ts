// app/api/shipments/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shipment from '@/models/Shipment.model';
import User from '@/models/User.model';
import { jwtVerify } from 'jose';
import { customAlphabet } from 'nanoid';
import { sanitizeInput, sanitizeObject, isValidEmail, isValidPhone, isValidAddress } from '@/lib/sanitize';
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

// GET: Fetch all shipments for the current tenant
export async function GET(request: NextRequest) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload || !payload.tenantId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if there's an assignedTo query parameter
    const { searchParams } = new URL(request.url);
    const assignedTo = searchParams.get('assignedTo');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    
    // 👇 FIX: Show shipments from BOTH current branch (tenantId) AND shipments at this branch (currentBranchId)
    // This allows admins to see shipments that arrived via manifest dispatch
    const query: any = {
      $or: [
        { tenantId: payload.tenantId },           // Shipments created by this branch
        { currentBranchId: payload.tenantId }     // Shipments currently at this branch
      ]
    };
    
    // If assignedTo parameter is provided, filter by it
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }
    
    // If date range is provided, filter by createdAt date
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      query.createdAt = {
        $gte: fromDate,
        $lt: toDate
      };
      console.log(`Filtering shipments from ${from} to ${to}`);
    }

    const shipments = await Shipment.find(query)
      .sort({ createdAt: -1 }) // Show newest first
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name')
      .populate('originBranchId', 'name')
      .populate('destinationBranchId', 'name')
      .populate('currentBranchId', 'name');

    return NextResponse.json(shipments);
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new shipment within the current tenant
export async function POST(request: NextRequest) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload || !payload.tenantId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  
  // Optional: Add a role check if only 'admin' can create shipments
  if (payload.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { assignedTo, originBranchId, destinationBranchId, ...shipmentData } = body;

    // Sanitize all string inputs to prevent XSS
    const sanitized = sanitizeObject(shipmentData);

    // Validate email and phone formats
    if (sanitized.sender?.email && !isValidEmail(sanitized.sender.email)) {
      return NextResponse.json({ message: 'Invalid sender email format' }, { status: 400 });
    }
    if (sanitized.recipient?.email && !isValidEmail(sanitized.recipient.email)) {
      return NextResponse.json({ message: 'Invalid recipient email format' }, { status: 400 });
    }
    if (sanitized.sender?.phone && !isValidPhone(sanitized.sender.phone)) {
      return NextResponse.json({ message: 'Invalid sender phone format' }, { status: 400 });
    }
    if (sanitized.recipient?.phone && !isValidPhone(sanitized.recipient.phone)) {
      return NextResponse.json({ message: 'Invalid recipient phone format' }, { status: 400 });
    }
    if (sanitized.sender?.address && !isValidAddress(sanitized.sender.address)) {
      return NextResponse.json({ message: 'Invalid sender address (5-200 chars)' }, { status: 400 });
    }
    if (sanitized.recipient?.address && !isValidAddress(sanitized.recipient.address)) {
      return NextResponse.json({ message: 'Invalid recipient address (5-200 chars)' }, { status: 400 });
    }

    // Validate that branch IDs are provided
    if (!originBranchId || !destinationBranchId) {
      console.error('Missing branch IDs:', { originBranchId, destinationBranchId });
      return NextResponse.json(
        { message: 'originBranchId and destinationBranchId are required' },
        { status: 400 }
      );
    }

    // Generate a unique, human-readable tracking ID
    const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 10);
    const trackingId = `TRK-${nanoid()}`;

    // Create the new shipment with sanitized data
    const newShipment = new Shipment({
      ...sanitized,
      trackingId: trackingId,
      createdBy:payload.userId || payload.id || payload.sub,
      status: 'At Origin Branch', // Set initial status
      tenantId: payload.tenantId, // CRUCIAL: Assign the creator's tenantId (current/origin branch)
      originBranchId, // The branch where this shipment was created
      destinationBranchId, // The final destination
      currentBranchId: payload.tenantId, // Initially, the shipment is at the origin branch
      statusHistory: [{ status: 'At Origin Branch', timestamp: new Date() }], // Start the history log
      ...(assignedTo && { assignedTo }) // Add assignedTo if provided
    });

    await newShipment.save();
    
    // Dispatch 'shipment_created' notification
    await dispatchNotification({
      event: 'shipment_created',
      shipmentId: newShipment._id.toString(),
      trackingId: newShipment.trackingId,
      tenantId: payload.tenantId as string,
      createdBy: (payload.userId || payload.id || payload.sub) as string,
    } as any).catch(err => {
      console.error('Error dispatching shipment_created notification:', err);
    });
    
    return NextResponse.json(newShipment, { status: 201 });

  } catch (error: any) {
    // Handle validation errors from Mongoose
    if (error.name === 'ValidationError') {
      return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}