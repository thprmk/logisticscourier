// app/api/pricing/zone-surcharges/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ZoneSurcharge from '@/models/ZoneSurcharge.model';
import Zone from '@/models/Zone.model';
import { jwtVerify } from 'jose';

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

// GET: List all zone surcharges
export async function GET(request: NextRequest) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Only superAdmin can view zone surcharges
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

    const surcharges = await ZoneSurcharge.find(query)
      .populate('fromZoneId', 'name')
      .populate('toZoneId', 'name')
      .populate('createdBy', 'name email')
      .sort({ fromZoneId: 1, toZoneId: 1 })
      .lean();

    return NextResponse.json(surcharges);
  } catch (error) {
    console.error('Error fetching zone surcharges:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create or update a zone surcharge
export async function POST(request: NextRequest) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Only superAdmin can create zone surcharges
  if (!verifySuperAdmin(payload)) {
    return NextResponse.json({ message: 'Forbidden - Super Admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { fromZoneId, toZoneId, surcharge, isActive } = body;

    // Validate required fields
    if (!fromZoneId || !toZoneId || surcharge === undefined) {
      return NextResponse.json(
        { message: 'fromZoneId, toZoneId, and surcharge are required' },
        { status: 400 }
      );
    }

    // Validate surcharge is a number
    const surchargeNum = parseFloat(surcharge);
    if (isNaN(surchargeNum) || surchargeNum < 0) {
      return NextResponse.json(
        { message: 'Surcharge must be a valid non-negative number' },
        { status: 400 }
      );
    }

    // Verify zones exist
    const [fromZone, toZone] = await Promise.all([
      Zone.findById(fromZoneId),
      Zone.findById(toZoneId),
    ]);

    if (!fromZone || !toZone) {
      return NextResponse.json(
        { message: 'One or both zones not found' },
        { status: 404 }
      );
    }

    // Check if surcharge already exists (upsert behavior)
    const existingSurcharge = await ZoneSurcharge.findOne({
      fromZoneId,
      toZoneId,
    });

    if (existingSurcharge) {
      // Update existing surcharge
      existingSurcharge.surcharge = surchargeNum;
      if (isActive !== undefined) {
        existingSurcharge.isActive = isActive;
      }
      await existingSurcharge.save();
      return NextResponse.json(existingSurcharge);
    } else {
      // Create new surcharge
      const newSurcharge = new ZoneSurcharge({
        fromZoneId,
        toZoneId,
        surcharge: surchargeNum,
        isActive: isActive !== undefined ? isActive : true,
        createdBy: payload.id || payload.userId || payload.sub,
      });

      await newSurcharge.save();
      return NextResponse.json(newSurcharge, { status: 201 });
    }
  } catch (error: any) {
    console.error('Error creating/updating zone surcharge:', error);
    if (error.name === 'ValidationError') {
      return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    if (error.code === 11000) {
      return NextResponse.json(
        { message: 'Zone surcharge for this combination already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

