import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
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

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserPayload(request);
    if (!payload || !payload.userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const shipmentId = formData.get('shipmentId') as string;
    const proofType = formData.get('proofType') as 'photo' | 'signature';

    if (!file || !shipmentId || !proofType) {
      return NextResponse.json(
        { message: 'Missing file, shipmentId, or proofType' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    
    // Create unique filename - use simpler flat structure
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const filename = `delivery-proofs/${shipmentId}-${proofType}-${timestamp}-${randomId}.jpg`;

    // Upload to Vercel Blob
    const { url } = await put(filename, buffer, {
      access: 'public',
      contentType: file.type || 'image/jpeg',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    
    console.log('Blob upload successful:', { filename, url, shipmentId });

    return NextResponse.json({ 
      url,
      type: proofType 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error uploading delivery proof:', { 
      message: error.message,
      code: error.code,
      status: error.status
    });
    return NextResponse.json(
      { message: 'Failed to upload proof', error: error.message },
      { status: 500 }
    );
  }
}
