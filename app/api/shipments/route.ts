// app/api/shipments/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shipment from '@/models/Shipment.model';
import User from '@/models/User.model'; // We'll need this later for assigning
import { jwtVerify } from 'jose';
import { customAlphabet } from 'nanoid';

// Helper to get the logged-in user's payload from their token
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

// GET: Fetch all shipments for the current tenant
export async function GET(request: NextRequest) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload || !payload.tenantId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    // CRUCIAL: Filter shipments by the tenantId from the user's token
    const shipments = await Shipment.find({ tenantId: payload.tenantId })
      .sort({ createdAt: -1 }) // Show newest first
      .populate('assignedTo', 'name email'); // Later, this will fetch the driver's name

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

    // Generate a unique, human-readable tracking ID
    const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 10);
    const trackingId = `TRK-${nanoid()}`;

    // Create the new shipment
    const newShipment = new Shipment({
      ...body,
      trackingId: trackingId,
      status: 'Pending', // Set initial status
      tenantId: payload.tenantId, // CRUCIAL: Assign the creator's tenantId
      statusHistory: [{ status: 'Pending', timestamp: new Date() }], // Start the history log
    });

    await newShipment.save();
    
    return NextResponse.json(newShipment, { status: 201 });

  } catch (error: any) {
    // Handle validation errors from Mongoose
    if (error.name === 'ValidationError') {
      return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}