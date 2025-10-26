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

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
    }

    // Find the user by email, REGARDLESS of their role.
    // Explicitly select the password for comparison.
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
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
    
    // The response now includes the correct redirect URL
    const response = NextResponse.json({
      message: 'Login successful.',
      success: true,
      redirectTo: redirectTo, // Send the redirect path to the frontend
    });

    response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24,
        path: '/',
    });

    return response;

  } catch (error) {
    console.error('Unified Login Error:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}