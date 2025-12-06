import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User.model';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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

    // Find the user by email
    const user = await User.findOne({ email: sanitizedEmail }).select('+password');

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
        id: user._id,
        sub: user._id,
        role: user.role,
        tenantId: user.tenantId,
      };
      redirectTo = '/superadmin/dashboard';
    } else {
      // If the user is any other role (e.g., 'admin', 'staff', 'delivery_staff')
      tokenPayload = {
        userId: user._id,
        role: user.role,
        tenantId: user.tenantId, 
        isManager: user.isManager, 
      };

      // 👇 FIX: Explicitly send delivery staff to their mobile view
      if (user.role === 'delivery_staff') {
        redirectTo = '/deliverystaff';
      } else {
        redirectTo = '/dashboard';
      }
    }
    // --- End of Smart Logic ---

    // Generate Token (30 Days)
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET!, { expiresIn: '30d' });
    
    console.log('Login successful for:', email, 'Role:', user.role);
    
    const response = NextResponse.json({
      message: 'Login successful.',
      success: true,
      redirectTo: redirectTo, // Sends the correct path to the frontend
    });

    // Set Cookie (30 Days)
    const cookieOptions: any = {
        httpOnly: true,
        secure: true, // Always use secure in production
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 Days in seconds
        path: '/',
    };

    response.cookies.set('token', token, cookieOptions);
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    
    return response;

  } catch (error) {
    console.error('Unified Login Error:', error);
    
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