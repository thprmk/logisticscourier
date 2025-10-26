// app/api/auth/superadmin/login/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User.model';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  // 1. Connect to the database
  await dbConnect();

  try {
    // 2. Get email and password from the request body
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required.' },
        { status: 400 }
      );
    }

    // 3. Find the user in the database
    // IMPORTANT: We use .select('+password') to explicitly ask for the password,
    // because our model is configured to hide it by default.
    const user = await User.findOne({ email, role: 'superAdmin' }).select('+password');

    // 4. Check if the user exists
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid credentials.' },
        { status: 401 } // 401 Unauthorized
      );
    }

    // 5. Compare the provided password with the stored hash
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return NextResponse.json(
        { message: 'Invalid credentials.' },
        { status: 401 }
      );
    }

    // 6. If password matches, create a JWT token
    const tokenPayload = {
      userId: user._id,
      role: user.role,
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET!, // The '!' asserts that we know this exists
      { expiresIn: '1d' } // Token will expire in 1 day
    );
    
    // 7. Create a successful response and set the token in a secure, httpOnly cookie
    const response = NextResponse.json({
      message: 'Login successful.',
      success: true,
    });

    response.cookies.set('token', token, {
        httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: 'strict', // Helps prevent CSRF attacks
        maxAge: 60 * 60 * 24, // 1 day in seconds
        path: '/',
    });

    return response;

  } catch (error) {
    console.error('Super Admin Login Error:', error);
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}