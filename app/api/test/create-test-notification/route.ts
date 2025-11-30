// Test endpoint to create a notification for the current user
// DELETE THIS ENDPOINT IN PRODUCTION

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import dbConnect from '@/lib/dbConnect';
import Notification from '@/models/Notification.model';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);

    const userId = payload.userId || payload.id || payload.sub;

    if (!userId) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    await dbConnect();

    // Create a test notification
    const testNotification = await Notification.create({
      tenantId: payload.tenantId || 'test-tenant',
      userId: userId.toString(),
      type: 'delivery_assigned',
      trackingId: `TEST-${Date.now()}`,
      message: `[TEST] Test notification created at ${new Date().toLocaleString()}`,
      read: false,
    });

    console.log('Test notification created:', {
      userId: userId.toString(),
      notificationId: testNotification._id,
      message: testNotification.message,
    });

    return NextResponse.json({
      message: 'Test notification created successfully',
      notification: testNotification,
    });
  } catch (error: any) {
    console.error('Error creating test notification:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create test notification' },
      { status: 500 }
    );
  }
}
