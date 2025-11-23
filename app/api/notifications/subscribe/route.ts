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

    const { subscription } = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { message: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Save or update subscription
    const pushSubscription = await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        userId: payload.userId,
        endpoint: subscription.endpoint,
        auth: subscription.keys.auth,
        p256dh: subscription.keys.p256dh,
      },
      { upsert: true, new: true }
    );

    console.log('Push subscription saved:', {
      userId: payload.userId,
      endpoint: subscription.endpoint,
    });

    return NextResponse.json({
      message: 'Subscription saved successfully',
      subscriptionId: pushSubscription._id,
    });
  } catch (error: any) {
    console.error('Error saving subscription:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to save subscription' },
      { status: 500 }
    );
  }
}
