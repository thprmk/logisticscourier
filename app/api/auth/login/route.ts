// app/api/auth/login/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User.model';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const { email, password } = await request.json();

    console.log('Login attempt for email:', email);

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
    }

    // Find the user by email, REGARDLESS of their role.
    // Explicitly select the password for comparison.
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      console.log('User not found:', email);
      return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
    }

    console.log('User found:', email, 'Role:', user.role);
    console.log('Password hash exists:', !!user.password);
    console.log('Password hash starts with $2a or $2b:', user.password?.startsWith('$2'));

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    console.log('Password match result:', isPasswordMatch);

    if (!isPasswordMatch) {
      console.log('Password mismatch for:', email);
      return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
    }

    // --- The "Smart" Logic Starts Here ---
    let tokenPayload = {};
    let redirectTo = '';

    if (user.role === 'superAdmin') {
      // If the user is a Super Admin
      tokenPayload = {
        userId: user._id,
        role: user.role,
      };
      redirectTo = '/superadmin/dashboard';
    } else {
      // If the user is any other role (e.g., 'admin', 'staff')
      tokenPayload = {
        userId: user._id,
        role: user.role,
        tenantId: user.tenantId, // Include tenantId for branch users
      };
      redirectTo = '/dashboard';
    }
    // --- End of Smart Logic ---

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET!, { expiresIn: '1d' });
    
    console.log('Login successful for:', email, 'Role:', user.role);
    console.log('Setting cookie with domain:', process.env.COOKIE_DOMAIN || 'not set');
    
    // The response now includes the correct redirect URL
    const response = NextResponse.json({
      message: 'Login successful.',
      success: true,
      redirectTo: redirectTo, // Send the redirect path to the frontend
    });

    // For Vercel, we need to be more explicit about cookie settings
    const cookieOptions: any = {
        httpOnly: true,
        secure: true, // Always use secure in production
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
        path: '/',
    };

    response.cookies.set('token', token, cookieOptions);
    
    console.log('Cookie set successfully');

    return response;

  } catch (error) {
    console.error('Unified Login Error:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}