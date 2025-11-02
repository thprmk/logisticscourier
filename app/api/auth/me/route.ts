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

    if (!token) {
      throw new Error('Authentication token not found.');
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    if (!payload.userId) {
      throw new Error('Invalid token payload.');
    }

    await dbConnect();
    const user = await User.findById<IUser>(payload.userId).select('name email role tenantId').populate('tenantId').lean();

    if (!user) {
      throw new Error('User not found.');
    }

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
    // Return a clear 401 Unauthorized error
    return NextResponse.json({ message: error.message || 'Authentication failed' }, { status: 401 });
  }
}