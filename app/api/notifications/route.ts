// app/api/notifications/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import dbConnect from '@/lib/dbConnect';
import Notification from '@/models/Notification.model';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);

    if (!payload.userId) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    console.log('Fetching notifications for user:', payload.userId);

    await dbConnect();

    // Fetch notifications for the logged-in user, sorted by newest first
    const notifications = await Notification.find({ userId: payload.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    console.log(`Found ${notifications.length} notifications for user ${payload.userId}`);

    return NextResponse.json(notifications);
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ message: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// Mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);

    if (!payload.userId) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const { notificationId } = await request.json();

    await dbConnect();

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId: payload.userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return NextResponse.json({ message: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Notification marked as read', notification });
  } catch (error: any) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ message: 'Failed to update notification' }, { status: 500 });
  }
}

// Mark all notifications as read
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);

    if (!payload.userId) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    await dbConnect();

    await Notification.updateMany(
      { userId: payload.userId, read: false },
      { read: true }
    );

    return NextResponse.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    console.error('Error marking all as read:', error);
    return NextResponse.json({ message: 'Failed to mark all as read' }, { status: 500 });
  }
}
