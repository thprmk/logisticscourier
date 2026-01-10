// app/api/pricing/zone-surcharges/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ZoneSurcharge from '@/models/ZoneSurcharge.model';
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

// PATCH: Update a zone surcharge
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!verifySuperAdmin(payload)) {
    return NextResponse.json({ message: 'Forbidden - Super Admin access required' }, { status: 403 });
  }

  try {
    const surcharge = await ZoneSurcharge.findById(params.id);
    if (!surcharge) {
      return NextResponse.json({ message: 'Zone surcharge not found' }, { status: 404 });
    }

    const body = await request.json();
    const { surcharge: newSurcharge, isActive } = body;

    if (newSurcharge !== undefined) {
      const surchargeNum = parseFloat(newSurcharge);
      if (isNaN(surchargeNum) || surchargeNum < 0) {
        return NextResponse.json(
          { message: 'Surcharge must be a valid non-negative number' },
          { status: 400 }
        );
      }
      surcharge.surcharge = surchargeNum;
    }

    if (isActive !== undefined) {
      surcharge.isActive = isActive;
    }

    await surcharge.save();

    return NextResponse.json(surcharge);
  } catch (error: any) {
    console.error('Error updating zone surcharge:', error);
    if (error.name === 'ValidationError') {
      return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete a zone surcharge
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!verifySuperAdmin(payload)) {
    return NextResponse.json({ message: 'Forbidden - Super Admin access required' }, { status: 403 });
  }

  try {
    const surcharge = await ZoneSurcharge.findByIdAndDelete(params.id);

    if (!surcharge) {
      return NextResponse.json({ message: 'Zone surcharge not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Zone surcharge deleted successfully' });
  } catch (error) {
    console.error('Error deleting zone surcharge:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

