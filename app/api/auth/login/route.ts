// app/api/auth/login/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User.model';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sanitizeInput } from '@/lib/sanitize';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

export async function POST(request: NextRequest) {
  // Validate Content-Type
  const contentType = request.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return NextResponse.json(
      { message: 'Content-Type must be application/json' },
      { status: 400 }
    );
  }

  // Check rate limit
  const clientIp = getClientIp(request);
  const rateLimitResult = checkRateLimit(clientIp, 'LOGIN');
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { message: 'Too many login attempts. Please try again later.' },
      { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': (Date.now() + rateLimitResult.resetTime).toString(),
        }
      }
    );
  }

  await dbConnect();

  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json(
        { message: 'Invalid request format. Please send valid JSON.' },
        { status: 400 }
      );
    }

    const { email, password } = body;

    // Sanitize inputs
    const sanitizedEmail = email?.toLowerCase().trim();
    const sanitizedPassword = password?.trim();

    if (!sanitizedEmail || !sanitizedPassword) {
      return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
    }

    // Find the user by email, REGARDLESS of their role.
    // Explicitly select the password for comparison.
    const user = await User.findOne({ email: sanitizedEmail }).select('+password');

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
        id: user._id,
        sub: user._id,
        role: user.role,
        tenantId: user.tenantId,
      };
      redirectTo = '/superadmin/dashboard';
    } else {
      // If the user is any other role (e.g., 'admin', 'staff')
      tokenPayload = {
        userId: user._id,
        role: user.role,
        tenantId: user.tenantId, // Include tenantId for branch users
        isManager: user.isManager, // Include isManager flag for permission checks
      };
      redirectTo = '/dashboard';
    }
    // --- End of Smart Logic ---

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET!, { expiresIn: '30d' });
    
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
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
    };

    response.cookies.set('token', token, cookieOptions);
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    
    console.log('Cookie set successfully');

    return response;

  } catch (error) {
    console.error('Unified Login Error:', error);
    
    // Only return JSON if we haven't already sent a response
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { message: 'Invalid JSON in request body.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}