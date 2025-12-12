// app/api/users/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User.model';
import bcrypt from 'bcryptjs';
import { jwtVerify } from 'jose';
import { sanitizeInput, isValidEmail } from '@/lib/sanitize';

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

        // Sanitize inputs to prevent XSS
        const sanitizedName = sanitizeInput(name, 100);
        const sanitizedEmail = email?.toLowerCase().trim();
        
        // Validate email format if provided
        if (sanitizedEmail && !isValidEmail(sanitizedEmail)) {
          return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
        }

        // Get current user (who is making the request)
        const requesterUser = await User.findById(payload.userId);
        if (!requesterUser) {
            return NextResponse.json({ message: 'Requester not found' }, { status: 404 });
        }

        // Check if user exists and belongs to the same tenant
        const user = await User.findOne({ _id: userId, tenantId: payload.tenantId });
        
        if (!user) {
            return NextResponse.json({ message: 'User not found or access denied' }, { status: 404 });
        }
        
        // Prevent editing own account
        if (user._id.toString() === payload.userId) {
            return NextResponse.json({ message: 'You cannot edit your own account. Contact Super Admin.' }, { status: 403 });
        }

        // SECURITY: Role Hierarchy Check
        // Only Branch Managers (admin + isManager=true) can edit other users
        // Dispatchers (admin + isManager=false) cannot edit anyone
        if (!requesterUser.isManager) {
            return NextResponse.json({ message: 'You do not have permission to edit users.' }, { status: 403 });
        }

        // SECURITY: Prevent editing Branch Managers
        // Only a Branch Manager can edit other staff/dispatchers, not other Branch Managers
        if (user.isManager) {
            return NextResponse.json({ message: 'Cannot edit a Branch Manager. Contact Super Admin.' }, { status: 403 });
        }

        // SECURITY: Prevent creating or promoting to Branch Manager
        // Validate that role is only 'staff' or 'admin', and if admin, must be dispatcher (isManager=false)
        if (!['admin', 'staff'].includes(role)) {
            return NextResponse.json({ message: 'Invalid role' }, { status: 400 });
        }

        // Update user fields with sanitized data
        user.name = sanitizedName;
        user.email = sanitizedEmail;
        user.role = role;
        // CRITICAL: Always set isManager to false for non-Branch-Manager admins (Dispatchers)
        user.isManager = false;
        
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

        // Get current user (who is making the request)
        const requesterUser = await User.findById(payload.userId);
        if (!requesterUser) {
            return NextResponse.json({ message: 'Requester not found' }, { status: 404 });
        }

        // Check if user exists and belongs to the same tenant
        const user = await User.findOne({ _id: userId, tenantId: payload.tenantId });
        
        if (!user) {
            return NextResponse.json({ message: 'User not found or access denied' }, { status: 404 });
        }

        // Prevent users from deleting themselves
        if (user._id.toString() === payload.userId) {
            return NextResponse.json({ message: 'You cannot delete yourself. Contact Super Admin.' }, { status: 400 });
        }

        // SECURITY: Role Hierarchy Check
        // Only Branch Managers (admin + isManager=true) can delete other users
        // Dispatchers (admin + isManager=false) cannot delete anyone
        if (!requesterUser.isManager) {
            return NextResponse.json({ message: 'You do not have permission to delete users.' }, { status: 403 });
        }

        // SECURITY: Prevent deleting Branch Managers
        // Only a Branch Manager can delete staff/dispatchers, not other Branch Managers
        if (user.isManager) {
            return NextResponse.json({ message: 'Cannot delete a Branch Manager. Contact Super Admin.' }, { status: 403 });
        }

        await User.deleteOne({ _id: userId });
        
        return NextResponse.json({ message: 'User removed successfully' }, { status: 200 });

    } catch (error: any) {
        console.error('User delete error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}