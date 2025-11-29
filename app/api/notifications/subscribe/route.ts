import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import PushSubscription from '@/models/PushSubscription.model';
import dbConnect from '@/lib/dbConnect';

// Helper to get user payload - supports both superAdmin (id/sub) and regular users (userId)
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
    
    // Support both userId (regular users) and id/sub (superAdmin)
    const userId = payload?.userId || payload?.id || payload?.sub;
    
    if (!payload || !userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let subscription;
    try {
      subscription = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { message: 'Invalid subscription data format' },
        { status: 400 }
      );
    }

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { message: 'Invalid subscription data: endpoint is required' },
        { status: 400 }
      );
    }

    if (!subscription.keys || !subscription.keys.auth || !subscription.keys.p256dh) {
      return NextResponse.json(
        { message: 'Invalid subscription data: missing encryption keys' },
        { status: 400 }
      );
    }

    // Save or update subscription
    const pushSubscription = await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        userId: userId.toString(),
        endpoint: subscription.endpoint,
        auth: subscription.keys.auth,
        p256dh: subscription.keys.p256dh,
      },
      { upsert: true, new: true }
    );

    console.log('Push subscription saved:', {
      userId: userId.toString(),
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
