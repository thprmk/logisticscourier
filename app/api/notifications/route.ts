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

    // Support both userId (regular users) and id/sub (superAdmin)
    const userId = payload.userId || payload.id || payload.sub;
    
    if (!userId) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    // ✅ FIX: Check tenantId for tenant data isolation
    if (!payload.tenantId && payload.role !== 'superAdmin') {
      return NextResponse.json({ message: 'Unauthorized - tenant required' }, { status: 401 });
    }

    console.log('Fetching notifications for user:', userId);
    console.log('User ID Type:', typeof userId);

    await dbConnect();

    // Convert userId to string for comparison if it's an object
    const userIdString = typeof userId === 'object' ? userId.toString() : String(userId);
    console.log('User ID String:', userIdString);

    // ✅ FIX: Filter by both userId AND tenantId for proper data isolation
    const query: any = { userId: userIdString };
    if (payload.tenantId && payload.role !== 'superAdmin') {
      query.tenantId = payload.tenantId;
    }

    // Fetch notifications for the logged-in user, sorted by newest first
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    console.log(`Found ${notifications.length} notifications for user ${userIdString}`);
    if (notifications.length > 0) {
      console.log('Latest notifications:', notifications.slice(0, 3).map(n => ({ 
        id: n._id, 
        message: n.message, 
        type: n.type,
        userId: n.userId,
        createdAt: n.createdAt,
        read: n.read 
      })));
    } else {
      console.log('[DEBUG] No notifications found. Checking database directly:');
      const allNotifs = await Notification.find({}).limit(5).lean();
      console.log('Sample of all notifications in DB:', allNotifs.map(n => ({ userId: n.userId, message: n.message })));
    }

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

    // Support both userId (regular users) and id/sub (superAdmin)
    const userId = payload.userId || payload.id || payload.sub;
    
    if (!userId) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    // ✅ FIX: Check tenantId for tenant data isolation
    if (!payload.tenantId && payload.role !== 'superAdmin') {
      return NextResponse.json({ message: 'Unauthorized - tenant required' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds } = body; // Expect an array of IDs

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json({ message: 'Notification IDs are required.' }, { status: 400 });
    }

    await dbConnect();

    // Convert userId to string for consistent comparison
    const userIdString = typeof userId === 'object' ? userId.toString() : String(userId);
    
    // ✅ FIX: Filter by both userId AND tenantId for proper data isolation
    const updateQuery: any = { _id: { $in: notificationIds }, userId: userIdString };
    if (payload.tenantId && payload.role !== 'superAdmin') {
      updateQuery.tenantId = payload.tenantId;
    }
    
    // Use $in to update multiple documents at once
    await Notification.updateMany(
      updateQuery,
      { $set: { read: true } }
    );

    console.log(`[PATCH] Marked ${notificationIds.length} notifications as read for user ${userIdString}`);
    return NextResponse.json({ message: 'Notifications marked as read' });
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

    // Support both userId (regular users) and id/sub (superAdmin)
    const userId = payload.userId || payload.id || payload.sub;
    
    if (!userId) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    // ✅ FIX: Check tenantId for tenant data isolation
    if (!payload.tenantId && payload.role !== 'superAdmin') {
      return NextResponse.json({ message: 'Unauthorized - tenant required' }, { status: 401 });
    }

    await dbConnect();

    // Convert userId to string for consistent comparison
    const userIdString = typeof userId === 'object' ? userId.toString() : String(userId);

    // ✅ FIX: Filter by both userId AND tenantId for proper data isolation
    const updateQuery: any = { userId: userIdString, read: false };
    if (payload.tenantId && payload.role !== 'superAdmin') {
      updateQuery.tenantId = payload.tenantId;
    }

    await Notification.updateMany(
      updateQuery,
      { read: true }
    );

    return NextResponse.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    console.error('Error marking all as read:', error);
    return NextResponse.json({ message: 'Failed to mark all as read' }, { status: 500 });
  }
}
