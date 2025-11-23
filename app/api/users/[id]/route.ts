// app/api/users/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User.model';
import bcrypt from 'bcryptjs';
import { jwtVerify } from 'jose';

async function getUserPayload(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  
  if (!token) {
    return null;
  }
  
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

// Helper to get the ID from the URL
function getUserIdFromUrl(url: string) {
    const pathParts = new URL(url).pathname.split('/');
    return pathParts[pathParts.length - 1];
}

// PATCH: Update a user
export async function PATCH(request: NextRequest) {
    await dbConnect();
    const payload = await getUserPayload(request);
    
    if (!payload || !payload.tenantId || payload.role !== 'admin') {
        return NextResponse.json({ message: 'Unauthorized or Forbidden' }, { status: 403 });
    }

    try {
        const userId = getUserIdFromUrl(request.url);
        const { name, email, role, password } = await request.json();

        // Check if user exists and belongs to the same tenant
        const user = await User.findOne({ _id: userId, tenantId: payload.tenantId });
        
        if (!user) {
            return NextResponse.json({ message: 'User not found or access denied' }, { status: 404 });
        }

        // Update user fields
        user.name = name;
        user.email = email;
        user.role = role;
        
        // Hash password if it's being updated
        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            user.password = hashedPassword;
            console.log('Password updated for user:', email);
        }
        
        await user.save();
        
        const userResponse = user.toObject();
        delete userResponse.password;

        return NextResponse.json(userResponse, { status: 200 });

    } catch (error: any) {
        console.error('User update error:', error);
        if (error.code === 11000) {
             return NextResponse.json({ message: 'Email already exists' }, { status: 409 });
        }
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

// DELETE: Remove a user
export async function DELETE(request: NextRequest) {
    await dbConnect();
    const payload = await getUserPayload(request);
    
    if (!payload || !payload.tenantId || payload.role !== 'admin') {
        return NextResponse.json({ message: 'Unauthorized or Forbidden' }, { status: 403 });
    }

    try {
        const userId = getUserIdFromUrl(request.url);

        // Check if user exists and belongs to the same tenant
        const user = await User.findOne({ _id: userId, tenantId: payload.tenantId });
        
        if (!user) {
            return NextResponse.json({ message: 'User not found or access denied' }, { status: 404 });
        }

        // Prevent users from deleting themselves
        if (user._id.toString() === payload.userId) {
            return NextResponse.json({ message: 'You cannot delete yourself' }, { status: 400 });
        }

        await User.deleteOne({ _id: userId });
        
        return NextResponse.json({ message: 'User removed successfully' }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}