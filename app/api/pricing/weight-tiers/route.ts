// app/api/pricing/weight-tiers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import WeightTier from '@/models/WeightTier.model';
import { jwtVerify } from 'jose';
import { sanitizeInput, sanitizeObject } from '@/lib/sanitize';
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

// GET: List all weight tiers
export async function GET(request: NextRequest) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Only superAdmin can view weight tiers
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

    const weightTiers = await WeightTier.find(query)
      .sort({ minWeight: 1 })
      .populate('createdBy', 'name email')
      .lean();

    return NextResponse.json(weightTiers);
  } catch (error) {
    console.error('Error fetching weight tiers:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new weight tier
export async function POST(request: NextRequest) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Only superAdmin can create weight tiers
  if (!verifySuperAdmin(payload)) {
    return NextResponse.json({ message: 'Forbidden - Super Admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { minWeight, maxWeight, price, isActive } = body;

    // Validate required fields
    if (minWeight === undefined || maxWeight === undefined || price === undefined) {
      return NextResponse.json(
        { message: 'minWeight, maxWeight, and price are required' },
        { status: 400 }
      );
    }

    // Validate numeric values
    const minWeightNum = parseFloat(minWeight);
    const maxWeightNum = parseFloat(maxWeight);
    const priceNum = parseFloat(price);

    if (isNaN(minWeightNum) || isNaN(maxWeightNum) || isNaN(priceNum)) {
      return NextResponse.json(
        { message: 'minWeight, maxWeight, and price must be valid numbers' },
        { status: 400 }
      );
    }

    if (minWeightNum < 0 || maxWeightNum < 0 || priceNum < 0) {
      return NextResponse.json(
        { message: 'minWeight, maxWeight, and price cannot be negative' },
        { status: 400 }
      );
    }

    if (maxWeightNum <= minWeightNum) {
      return NextResponse.json(
        { message: 'maxWeight must be greater than minWeight' },
        { status: 400 }
      );
    }

    // Check for overlapping tiers
    const existingTiers = await WeightTier.find({ isActive: true }).lean();
    for (const tier of existingTiers) {
      // Check for overlap: new tier overlaps if it starts before existing tier ends and ends after existing tier starts
      if (
        (minWeightNum < tier.maxWeight && maxWeightNum > tier.minWeight) ||
        (minWeightNum === tier.minWeight && maxWeightNum === tier.maxWeight)
      ) {
        return NextResponse.json(
          {
            message: `Weight tier overlaps with existing tier (${tier.minWeight} - ${tier.maxWeight} kg)`,
          },
          { status: 400 }
        );
      }
    }

    // Create new weight tier
    const newTier = new WeightTier({
      minWeight: minWeightNum,
      maxWeight: maxWeightNum,
      price: priceNum,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: payload.id || payload.userId || payload.sub,
    });

    await newTier.save();

    // Validate all tiers after creation
    const validation = await validateWeightTiers();
    if (!validation.isValid) {
      // Still save, but return warning
      return NextResponse.json(
        {
          message: 'Weight tier created, but validation warnings exist',
          warnings: validation.warnings,
          tier: newTier,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(newTier, { status: 201 });
  } catch (error: any) {
    console.error('Error creating weight tier:', error);
    if (error.name === 'ValidationError') {
      return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

