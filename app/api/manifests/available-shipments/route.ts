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
// Query params: destinationBranchId (optional - to filter by destination)
export async function GET(request: NextRequest) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload || !payload.tenantId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const destinationBranchId = searchParams.get('destinationBranchId');

    let query: any = {
      currentBranchId: payload.tenantId,
      status: 'At Origin Branch',
    };

    // Filter by destination branch if provided
    if (destinationBranchId) {
      query.destinationBranchId = destinationBranchId;
    }

    const shipments = await Shipment.find(query)
      .populate('originBranchId', 'name')
      .populate('destinationBranchId', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json(shipments);
  } catch (error) {
    console.error('Error fetching available shipments:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
