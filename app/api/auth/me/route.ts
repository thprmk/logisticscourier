// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User.model';
import Tenant from '@/models/Tenant.model';
import { IUser } from '@/models/User.model'; // Import interface for type safety

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    console.log('Auth check - Token present:', !!token);
    console.log('Auth check - Headers:', Object.fromEntries(request.headers.entries()));

    if (!token) {
      console.log('Auth failed: No token found in cookies');
      throw new Error('Authentication token not found.');
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    if (!payload.userId) {
      console.log('Auth failed: Invalid token payload');
      throw new Error('Invalid token payload.');
    }

    await dbConnect();
    const user = await User.findById<IUser>(payload.userId).select('name email role tenantId').populate('tenantId').lean();

    if (!user) {
      console.log('Auth failed: User not found');
      throw new Error('User not found.');
    }

    console.log('Auth successful for user:', user.email);

    // Prepare response data
    const responseData: any = {
      id: (user._id as any).toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };

    // Add tenant information for admin and staff roles
    if (user.role === 'admin' || user.role === 'staff') {
      if (user.tenantId) {
        responseData.tenantId = (user.tenantId as any)._id.toString();
        responseData.tenantName = (user.tenantId as any).name;
      }
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Auth error:', error.message);
    // Return a clear 401 Unauthorized error
    return NextResponse.json({ message: error.message || 'Authentication failed' }, { status: 401 });
  }
}