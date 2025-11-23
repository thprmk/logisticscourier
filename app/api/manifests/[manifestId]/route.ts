// app/api/manifests/[manifestId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Manifest from '@/models/Manifest.model';
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

// GET: Fetch a single manifest by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ manifestId: string }> }
) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload || !payload.tenantId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { manifestId } = await params;

    const manifest = await Manifest.findById(manifestId)
      .populate('fromBranchId', 'name')
      .populate('toBranchId', 'name')
      .populate('shipmentIds');

    if (!manifest) {
      return NextResponse.json({ message: 'Manifest not found' }, { status: 404 });
    }

    // Verify that the user has access to this manifest
    // (either from origin or destination branch)
    const isOriginBranch = manifest.fromBranchId._id.toString() === payload.tenantId.toString();
    const isDestinationBranch = manifest.toBranchId._id.toString() === payload.tenantId.toString();

    if (!isOriginBranch && !isDestinationBranch) {
      return NextResponse.json(
        { message: 'Forbidden: You do not have access to this manifest' },
        { status: 403 }
      );
    }

    return NextResponse.json(manifest);
  } catch (error) {
    console.error('Error fetching manifest:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
