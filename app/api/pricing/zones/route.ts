// app/api/pricing/zones/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Zone from '@/models/Zone.model';
import { jwtVerify } from 'jose';
import { sanitizeInput } from '@/lib/sanitize';

// Helper to get user payload
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

// Helper to verify superAdmin access
function verifySuperAdmin(payload: any) {
  return payload && payload.role === 'superAdmin';
}

// GET: List all zones
export async function GET(request: NextRequest) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Only superAdmin can view zones
  if (!verifySuperAdmin(payload)) {
    return NextResponse.json({ message: 'Forbidden - Super Admin access required' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const query: any = {};
    if (!includeInactive) {
      query.isActive = true;
    }

    const zones = await Zone.find(query)
      .sort({ name: 1 })
      .populate('createdBy', 'name email')
      .lean();

    return NextResponse.json(zones);
  } catch (error) {
    console.error('Error fetching zones:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new zone
export async function POST(request: NextRequest) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Only superAdmin can create zones
  if (!verifySuperAdmin(payload)) {
    return NextResponse.json({ message: 'Forbidden - Super Admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, description, isActive } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { message: 'Zone name is required and must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedName = sanitizeInput(name.trim(), 100);
    const sanitizedDescription = description ? sanitizeInput(description, 500) : undefined;

    // Check if zone with same name already exists
    const existingZone = await Zone.findOne({ name: sanitizedName });
    if (existingZone) {
      return NextResponse.json(
        { message: 'Zone with this name already exists' },
        { status: 409 }
      );
    }

    // Create new zone
    const newZone = new Zone({
      name: sanitizedName,
      description: sanitizedDescription,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: payload.id || payload.userId || payload.sub,
    });

    await newZone.save();

    return NextResponse.json(newZone, { status: 201 });
  } catch (error: any) {
    console.error('Error creating zone:', error);
    if (error.name === 'ValidationError') {
      return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    if (error.code === 11000) {
      return NextResponse.json({ message: 'Zone with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

