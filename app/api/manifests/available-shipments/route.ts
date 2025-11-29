// app/api/manifests/available-shipments/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shipment from '@/models/Shipment.model';
import { jwtVerify } from 'jose';

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

// GET: Get shipments available for dispatch at the origin branch
// Query params: destinationBranchId (optional - to filter by destination), page, limit (for pagination)
export async function GET(request: NextRequest) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload || !payload.tenantId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const destinationBranchId = searchParams.get('destinationBranchId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    let query: any = {
      currentBranchId: payload.tenantId,
      status: 'At Origin Branch',
    };

    // Filter by destination branch if provided
    if (destinationBranchId) {
      query.destinationBranchId = destinationBranchId;
    }

    // Get total count for pagination
    const total = await Shipment.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const shipments = await Shipment.find(query)
      .populate('originBranchId', 'name')
      .populate('destinationBranchId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      data: shipments,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching available shipments:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
