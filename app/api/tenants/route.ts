// app/api/tenants/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect'; // Use alias for consistency
import Tenant from '@/models/Tenant.model';
import User from '@/models/User.model';
import bcrypt from 'bcryptjs';
import { jwtVerify } from 'jose';
import { sanitizeInput, isValidEmail } from '@/lib/sanitize';

// Helper function to get and verify the token
async function verifyAuth(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    if (!token) return null;
    
    try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
        // Allow both superAdmin and admin
        if (payload.role === 'superAdmin' || payload.role === 'admin') {
            return payload;
        }
        return null;
    } catch (error) {
        return null;
    }
}

// Helper function to verify superAdmin only (for POST requests)
async function verifySuperAdmin(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    if (!token) return null;
    
    try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
        if (payload.role === 'superAdmin') {
            return payload;
        }
        return null;
    } catch (error) {
        return null;
    }
}

export async function GET(request: NextRequest) {
    await dbConnect();

    const authPayload = await verifyAuth(request);
    if (!authPayload) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Use MongoDB's powerful aggregation pipeline
        const tenantsWithAdmins = await Tenant.aggregate([
            {
                $lookup: {
                    from: 'users', // The name of the users collection
                    localField: '_id',
                    foreignField: 'tenantId',
                    as: 'admins'
                }
            },
            {
                $project: {
                    name: 1,
                    createdAt: 1,
                    admin: { $arrayElemAt: [ '$admins', 0 ] } // Get the first user found
                }
            },
            {
                $project: {
                    name: 1,
                    createdAt: 1,
                    'admin.name': 1,
                    'admin.email': 1,
                     'admin.phone': 1, // Add this if you store phone on the User model
                }
            },
            {
                $sort: { createdAt: -1 } // Sort by newest first
            }
        ]);
        
        return NextResponse.json(tenantsWithAdmins);
    } catch (error) {
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
// Handler for POST requests (Create a new tenant)
export async function POST(request: NextRequest) {
    await dbConnect();
    
    const superAdminPayload = await verifySuperAdmin(request);
    if (!superAdminPayload) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { branchName, adminName, adminEmail, adminPassword } = await request.json();

        // Sanitize inputs to prevent XSS
        const sanitizedBranchName = sanitizeInput(branchName, 100);
        const sanitizedAdminName = sanitizeInput(adminName, 100);
        const sanitizedAdminEmail = adminEmail?.toLowerCase().trim();
        
        // Validate email format
        if (!isValidEmail(sanitizedAdminEmail)) {
          return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
        }

        // 1. Create the new Tenant (Branch) with sanitized data
        const newTenant = new Tenant({ name: sanitizedBranchName });
        await newTenant.save();

        // 2. Hash the new admin's password
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // 3. Create the new Tenant Admin user with sanitized data
        const newAdmin = new User({
            name: sanitizedAdminName,
            email: sanitizedAdminEmail,
            password: hashedPassword,
            role: 'admin',
            tenantId: newTenant._id, // Link the user to the new tenant
            isManager: true, 
        });
        await newAdmin.save();
        
        return NextResponse.json({
            message: 'Tenant and Admin created successfully',
            tenant: newTenant,
        }, { status: 201 });

    } catch (error: any) {
        console.error('Tenant creation error:', error);
        // Handle potential duplicate key error for email or tenant name
        if (error.code === 11000) {
             return NextResponse.json({ message: 'A branch or admin with that name/email already exists.' }, { status: 409 });
        }
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}