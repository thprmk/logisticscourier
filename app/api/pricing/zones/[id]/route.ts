// app/api/pricing/zones/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Zone from '@/models/Zone.model';
import Tenant from '@/models/Tenant.model';
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

// GET: Get a single zone with branches
export async function GET(
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
    const zone = await Zone.findById(params.id)
      .populate('createdBy', 'name email')
      .lean();

    if (!zone) {
      return NextResponse.json({ message: 'Zone not found' }, { status: 404 });
    }

    // Get branches assigned to this zone
    const branches = await Tenant.find({ zoneId: params.id })
      .select('name')
      .lean();

    return NextResponse.json({
      ...zone,
      branches: branches.map(b => ({ _id: b._id.toString(), name: b.name })),
    });
  } catch (error) {
    console.error('Error fetching zone:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update a zone
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
    const zone = await Zone.findById(params.id);
    if (!zone) {
      return NextResponse.json({ message: 'Zone not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, isActive } = body;

    // Update fields if provided
    if (name !== undefined) {
      const sanitizedName = sanitizeInput(name.trim(), 100);
      if (sanitizedName.length < 2) {
        return NextResponse.json(
          { message: 'Zone name must be at least 2 characters' },
          { status: 400 }
        );
      }

      // Check if another zone with same name exists
      const existingZone = await Zone.findOne({ name: sanitizedName, _id: { $ne: params.id } });
      if (existingZone) {
        return NextResponse.json(
          { message: 'Zone with this name already exists' },
          { status: 409 }
        );
      }

      zone.name = sanitizedName;
    }

    if (description !== undefined) {
      zone.description = description ? sanitizeInput(description, 500) : undefined;
    }

    if (isActive !== undefined) {
      zone.isActive = isActive;
    }

    await zone.save();

    return NextResponse.json(zone);
  } catch (error: any) {
    console.error('Error updating zone:', error);
    if (error.name === 'ValidationError') {
      return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    if (error.code === 11000) {
      return NextResponse.json({ message: 'Zone with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete a zone (only if no branches assigned)
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
    // Check if any branches are assigned to this zone
    const branchesWithZone = await Tenant.countDocuments({ zoneId: params.id });

    if (branchesWithZone > 0) {
      return NextResponse.json(
        {
          message: `Cannot delete zone. ${branchesWithZone} branch(es) are assigned to this zone. Please reassign branches first.`,
        },
        { status: 400 }
      );
    }

    const zone = await Zone.findByIdAndDelete(params.id);

    if (!zone) {
      return NextResponse.json({ message: 'Zone not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Zone deleted successfully' });
  } catch (error) {
    console.error('Error deleting zone:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

