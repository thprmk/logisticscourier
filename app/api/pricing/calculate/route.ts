// app/api/pricing/calculate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { jwtVerify } from 'jose';
import { calculateFinalPrice } from '@/lib/pricingCalculator';
import { getZonesForBranches, validateZoneAssignment } from '@/lib/zoneService';

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

// POST: Calculate price for a shipment
export async function POST(request: NextRequest) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Allow admin, dispatcher, and superAdmin to calculate prices
  const allowedRoles = ['admin', 'dispatcher', 'superAdmin'];
  if (!payload.role || !allowedRoles.includes(payload.role)) {
    return NextResponse.json(
      { message: 'Forbidden - Admin or Dispatcher access required' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { weight, originBranchId, destinationBranchId } = body;

    // Validate required fields
    if (weight === undefined || !originBranchId || !destinationBranchId) {
      return NextResponse.json(
        { message: 'weight, originBranchId, and destinationBranchId are required' },
        { status: 400 }
      );
    }

    // Validate weight
    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum < 0) {
      return NextResponse.json(
        { message: 'Weight must be a valid non-negative number' },
        { status: 400 }
      );
    }

    // Get zones for both branches
    const zones = await getZonesForBranches(originBranchId, destinationBranchId);

    if (!zones.originZoneId || !zones.destinationZoneId) {
      // Validate zone assignment
      const validation = await validateZoneAssignment(originBranchId, destinationBranchId);
      return NextResponse.json(
        {
          message: 'Zone assignment error',
          errors: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 }
      );
    }

    // Calculate final price
    const priceResult = await calculateFinalPrice(
      weightNum,
      zones.originZoneId,
      zones.destinationZoneId
    );

    // Add zone names to breakdown
    priceResult.breakdown.fromZone = zones.originZoneName || undefined;
    priceResult.breakdown.toZone = zones.destinationZoneName || undefined;
    priceResult.breakdown.isSameZone = zones.isSameZone;

    return NextResponse.json(priceResult);
  } catch (error: any) {
    console.error('Error calculating price:', error);
    return NextResponse.json(
      {
        message: error.message || 'Price calculation failed',
        error: 'CALCULATION_ERROR',
      },
      { status: 400 }
    );
  }
}

