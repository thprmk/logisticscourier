// app/api/users/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User.model';
import bcrypt from 'bcryptjs';
import { jwtVerify } from 'jose';

async function getUserPayload(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  
  if (!token) {
    console.log("No token found in cookies.");
    return null;
  }
  
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

// GET: Fetch all users for the current tenant
export async function GET(request: NextRequest) {
    await dbConnect();
    const payload = await getUserPayload(request);
    
    if (!payload || !payload.tenantId || payload.role !== 'admin') {
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
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

// POST: Create a new user within the current tenant
export async function POST(request: NextRequest) {
    await dbConnect();
    const payload = await getUserPayload(request);

    // Security Check: Ensure user is logged in and is an admin
    if (!payload || !payload.tenantId || payload.role !== 'admin') {
        return NextResponse.json({ message: 'Unauthorized or Forbidden' }, { status: 403 });
    }

    try {
        const { name, email, password, role } = await request.json();

        // Hash the new user's password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the new user and AUTOMATICALLY assign the admin's tenantId
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role, // e.g., 'staff'
            tenantId: payload.tenantId, // Inherits tenantId from the creator
        });
        await newUser.save();
        
        const userResponse = newUser.toObject();
        delete userResponse.password;

        return NextResponse.json(userResponse, { status: 201 });

    } catch (error: any) {
        if (error.code === 11000) {
             return NextResponse.json({ message: 'Email already exists' }, { status: 409 });
        }
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}