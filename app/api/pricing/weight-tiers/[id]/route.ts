// app/api/pricing/weight-tiers/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import WeightTier from '@/models/WeightTier.model';
import { jwtVerify } from 'jose';
import { validateWeightTiers } from '@/lib/pricingCalculator';

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

// GET: Get a single weight tier
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
    const tier = await WeightTier.findById(params.id)
      .populate('createdBy', 'name email')
      .lean();

    if (!tier) {
      return NextResponse.json({ message: 'Weight tier not found' }, { status: 404 });
    }

    return NextResponse.json(tier);
  } catch (error) {
    console.error('Error fetching weight tier:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update a weight tier
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
    const tier = await WeightTier.findById(params.id);
    if (!tier) {
      return NextResponse.json({ message: 'Weight tier not found' }, { status: 404 });
    }

    const body = await request.json();
    const { minWeight, maxWeight, price, isActive } = body;

    // Update fields if provided
    if (minWeight !== undefined) {
      const minWeightNum = parseFloat(minWeight);
      if (isNaN(minWeightNum) || minWeightNum < 0) {
        return NextResponse.json({ message: 'Invalid minWeight' }, { status: 400 });
      }
      tier.minWeight = minWeightNum;
    }

    if (maxWeight !== undefined) {
      const maxWeightNum = parseFloat(maxWeight);
      if (isNaN(maxWeightNum) || maxWeightNum < 0) {
        return NextResponse.json({ message: 'Invalid maxWeight' }, { status: 400 });
      }
      tier.maxWeight = maxWeightNum;
    }

    if (price !== undefined) {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum < 0) {
        return NextResponse.json({ message: 'Invalid price' }, { status: 400 });
      }
      tier.price = priceNum;
    }

    if (isActive !== undefined) {
      tier.isActive = isActive;
    }

    // Validate maxWeight > minWeight
    if (tier.maxWeight <= tier.minWeight) {
      return NextResponse.json(
        { message: 'maxWeight must be greater than minWeight' },
        { status: 400 }
      );
    }

    // Check for overlaps with other tiers (excluding current tier)
    const existingTiers = await WeightTier.find({
      isActive: true,
      _id: { $ne: params.id },
    }).lean();

    for (const existingTier of existingTiers) {
      if (
        (tier.minWeight < existingTier.maxWeight && tier.maxWeight > existingTier.minWeight) ||
        (tier.minWeight === existingTier.minWeight && tier.maxWeight === existingTier.maxWeight)
      ) {
        return NextResponse.json(
          {
            message: `Weight tier overlaps with existing tier (${existingTier.minWeight} - ${existingTier.maxWeight} kg)`,
          },
          { status: 400 }
        );
      }
    }

    await tier.save();

    // Validate all tiers
    const validation = await validateWeightTiers();
    if (!validation.isValid) {
      return NextResponse.json(
        {
          message: 'Weight tier updated, but validation warnings exist',
          warnings: validation.warnings,
          tier,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(tier);
  } catch (error: any) {
    console.error('Error updating weight tier:', error);
    if (error.name === 'ValidationError') {
      return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete a weight tier
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
    const tier = await WeightTier.findByIdAndDelete(params.id);

    if (!tier) {
      return NextResponse.json({ message: 'Weight tier not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Weight tier deleted successfully' });
  } catch (error) {
    console.error('Error deleting weight tier:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

