import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import PushSubscription from '@/models/PushSubscription.model';
import dbConnect from '@/lib/dbConnect';

// Helper to get user payload
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
    await dbConnect();
    
    const payload = await getUserPayload(request);
    
    if (!payload || !payload.userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json(
        { message: 'Endpoint is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Delete subscription
    const result = await PushSubscription.deleteOne({ endpoint });

    console.log('Push subscription deleted:', {
      userId: payload.userId,
      endpoint,
      deletedCount: result.deletedCount,
    });

    return NextResponse.json({
      message: 'Unsubscribed successfully',
    });
  } catch (error: any) {
    console.error('Error unsubscribing:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}
