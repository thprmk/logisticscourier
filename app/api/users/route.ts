// app/api/users/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User.model';
import bcrypt from 'bcryptjs';
import { jwtVerify } from 'jose';
import { sanitizeInput, isValidEmail } from '@/lib/sanitize';

async function getUserPayload(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  
  console.log("Token from cookies:", token);
  
  if (!token) {
    console.log("No token found in cookies.");
    return null;
  }
  
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    console.log("JWT payload:", payload);
    return payload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

// GET: Fetch all users for the current tenant
export async function GET(request: NextRequest) {
    console.log("GET /api/users called");
    await dbConnect();
    const payload = await getUserPayload(request);
    
    if (!payload || !payload.tenantId || payload.role !== 'admin') {
        console.log("GET /api/users unauthorized", { payload, tenantId: payload?.tenantId, role: payload?.role });
        return NextResponse.json({ message: 'Unauthorized or Forbidden' }, { status: 403 });
    }

    // NEW: Check for a role filter in the URL query parameters
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get('role');

    try {
        // Build the query object
        const query: { tenantId: any; role?: string } = { tenantId: payload.tenantId };
        
        if (roleFilter) {
            query.role = roleFilter; // If a role is specified, add it to the query
        }

        const users = await User.find(query).select('-password');
        
        return NextResponse.json(users);
    } catch (error) {
        console.error("GET /api/users error", error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

// POST: Create a new user within the current tenant
export async function POST(request: NextRequest) {
    await dbConnect();
    const payload = await getUserPayload(request);

    // Security Check
    if (!payload || !payload.tenantId || payload.role !== 'admin') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    try {
        // 👇 FIX 1: Look for 'userId' (which is what your Login uses)
        const creatorId = payload.userId || payload.id || payload.sub;

        if (!creatorId) {
             return NextResponse.json({ message: 'Invalid Token' }, { status: 401 });
        }

        const { name, email, password, role } = await request.json();

        // Sanitize inputs to prevent XSS
        const sanitizedName = sanitizeInput(name, 100);
        const sanitizedEmail = email.toLowerCase().trim();
        
        // Validate email format
        if (!isValidEmail(sanitizedEmail)) {
          return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
        }

        // Rule A: Block Super Admin creation
        if (role === 'superAdmin') {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        // Rule B: Only a "Manager" can create other "Admins"
        if (role === 'admin') {
            // Use isManager from JWT first (newly added), fallback to database fetch for legacy tokens
            let isCreatorManager = payload.isManager;
            
            if (isCreatorManager === undefined) {
                // Fallback: fetch from database if not in JWT
                const creator = await User.findById(creatorId);
                if (!creator) {
                    console.error("User not found for ID:", creatorId);
                    return NextResponse.json({ message: 'User not found' }, { status: 404 });
                }
                isCreatorManager = creator.isManager;
            }
            
            // Note: If 'isManager' is undefined, it counts as false
            if (isCreatorManager !== true) {
                return NextResponse.json(
                    { message: 'Permission Denied: Only the Branch Manager can create other Admins.' }, 
                    { status: 403 }
                );
            }
        }

        // Rule C: Validate Role Input
        if (!['admin', 'staff'].includes(role)) {
            return NextResponse.json({ message: 'Invalid role.' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the new user with sanitized data
        const newUser = new User({
            name: sanitizedName,
            email: sanitizedEmail,
            password: hashedPassword,
            role, 
            tenantId: payload.tenantId, 
            // 👇 FIX 2: New Admins created here are NOT Managers (they are Dispatchers)
            // This ensures they cannot create other admins later.
            isManager: false, 
        });

        await newUser.save();
        
        const userResponse = newUser.toObject();
        delete userResponse.password;

        return NextResponse.json(userResponse, { status: 201 });

    } catch (error: any) {
        if (error.code === 11000) {
             return NextResponse.json({ message: 'Email already exists' }, { status: 409 });
        }
        console.error("Create User Error:", error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}