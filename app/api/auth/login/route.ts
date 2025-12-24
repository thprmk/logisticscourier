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

  // Connect to database (with timeout)
  const dbConnectPromise = dbConnect();
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Database connection timeout')), 3000)
  );
  
  try {
    await Promise.race([dbConnectPromise, timeoutPromise]);
  } catch (error) {
    console.error('Database connection failed:', error);
    return NextResponse.json(
      { message: 'Database connection failed. Please try again.' },
      { status: 503 }
    );
  }

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

    // Find the user by email - optimized query with only needed fields
    // Using select('+password') to explicitly include password field (normally hidden)
    // Not using .lean() here to ensure password field is properly included
    const user = await User.findOne({ email: sanitizedEmail })
      .select('_id role tenantId isManager +password')
      .exec();

    if (!user || !user.password) {
      return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
    }

    // Compare password with timeout protection
    const passwordComparePromise = bcrypt.compare(sanitizedPassword, user.password);
    const passwordTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Password verification timeout')), 2000)
    );
    
    const isPasswordMatch = await Promise.race([passwordComparePromise, passwordTimeoutPromise]) as boolean;

    if (!isPasswordMatch) {
      return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
    }

    // --- The "Smart" Logic Starts Here ---
    let tokenPayload = {};
    let redirectTo = '';

    // Convert ObjectId to string for token payload
    const userId = user._id.toString();
    const tenantId = user.tenantId ? user.tenantId.toString() : undefined;

    if (user.role === 'superAdmin') {
      // If the user is a Super Admin
      tokenPayload = {
        id: userId,
        sub: userId,
        role: user.role,
        tenantId: tenantId,
      };
      redirectTo = '/superadmin/dashboard';
    } else {
      // If the user is any other role (e.g., 'admin', 'staff', 'dispatcher')
      tokenPayload = {
        userId: userId,
        role: user.role,
        tenantId: tenantId, 
        isManager: user.isManager || false, 
      };

      // Route based on role
      if (user.role === 'staff') {
        redirectTo = '/deliverystaff';
      } else {
        redirectTo = '/dashboard';
      }
    }
    // --- End of Smart Logic ---

    // Generate Token (30 Days)
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET!, { expiresIn: '30d' });
    
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