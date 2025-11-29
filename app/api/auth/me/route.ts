import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User.model';
import Tenant from '@/models/Tenant.model'; 

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Authentication token not found.' }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    // 👇 FIX: Check for 'userId' OR 'id' OR 'sub'
    const userId = payload.userId || payload.id || payload.sub;

    if (!userId) {
      console.log('Auth failed: Token payload missing ID');
      return NextResponse.json({ message: 'Invalid token payload.' }, { status: 401 });
    }

    await dbConnect();
    
    // Ensure Tenant model is registered
    if (!Tenant) console.error('Tenant model not loaded');
    
    // Find User
    const user = await User.findById(userId)
      .select('name email role tenantId isManager') // Added isManager
      .populate('tenantId')
      .lean();

    if (!user) {
      console.log('Auth failed: User not found in DB');
      return NextResponse.json({ message: 'User not found.' }, { status: 401 });
    }

    // Prepare response data
    const responseData: any = {
      id: (user as any)._id.toString(),
      name: (user as any).name,
      email: (user as any).email,
      role: (user as any).role,
      isManager: (user as any).isManager, // Useful for frontend permission checks
    };

    // Add tenant information for admin and staff roles
    if ((user as any).role === 'admin' || (user as any).role === 'staff') {
      if ((user as any).tenantId) {
        responseData.tenantId = ((user as any).tenantId as any)._id.toString();
        responseData.tenantName = ((user as any).tenantId as any).name;
      }
    }

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('Auth error:', error.message);
    return NextResponse.json({ message: 'Authentication failed' }, { status: 401 });
  }
}