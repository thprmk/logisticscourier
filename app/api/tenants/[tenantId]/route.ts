// app/api/tenants/[tenantId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tenant from '@/models/Tenant.model';
import User from '@/models/User.model';
import Shipment from '@/models/Shipment.model';
import { jwtVerify } from 'jose';
import mongoose from 'mongoose';

// Helper function to verify Super Admin role from the token cookie
async function verifySuperAdmin(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    if (!token) return null;
    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
        const { payload } = await jwtVerify(token, secret);
        if (payload.role === 'superAdmin') {
            return payload;
        }
        return null;
    } catch (error) {
        return null;
    }
}

// Helper function to manually parse the tenantId from the request URL
const getTenantIdFromUrl = (request: NextRequest) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    // The URL is structured as /api/tenants/TENANT_ID, so the ID is the last part
    return pathParts[pathParts.length - 1];
};

// GET handler for fetching details of a single tenant
export async function GET(request: NextRequest) {
    await dbConnect();
    if (!await verifySuperAdmin(request)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const tenantId = getTenantIdFromUrl(request);
        const tenant = await Tenant.findById(tenantId);

        if (!tenant) {
            return NextResponse.json({ message: 'Tenant not found' }, { status: 404 });
        }
        const admin = await User.findOne({ tenantId: tenantId, role: 'admin' }).select('email');
        
        return NextResponse.json({ ...tenant.toObject(), admin });
    } catch (error) {
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    await dbConnect();
    if (!await verifySuperAdmin(request)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const tenantId = getTenantIdFromUrl(request);
        const body = await request.json();
        
        const { name, adminName, adminEmail, adminPassword } = body;

        // --- Update Tenant ---
        if (name) {
            const updatedTenant = await Tenant.findByIdAndUpdate(tenantId, { name }, { new: true });
            if (!updatedTenant) {
                return NextResponse.json({ message: 'Tenant not found' }, { status: 404 });
            }
        }

        // --- Update Admin User ---
        // Find the admin associated with this tenant
        const adminUser = await User.findOne({ tenantId, role: 'admin' });
        if (adminUser) {
            if (adminName) adminUser.name = adminName;
            if (adminEmail) adminUser.email = adminEmail;

            // Only update the password if a new one is provided
            if (adminPassword) {
                const hashedPassword = await bcrypt.hash(adminPassword, 10);
                adminUser.password = hashedPassword;
                // Important: Mongoose needs to be told the password field is being modified
                adminUser.markModified('password');
            }

            await adminUser.save();
        }

        return NextResponse.json({ message: 'Branch updated successfully' });

    } catch (error: any) {
        if (error.code === 11000) { // Handle duplicate email error
            return NextResponse.json({ message: 'Admin email already in use.' }, { status: 409 });
        }
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}


// DELETE handler for removing a tenant and all its associated data
export async function DELETE(request: NextRequest) {
    await dbConnect();
    if (!await verifySuperAdmin(request)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantIdFromUrl(request);

    try {
        const session = await mongoose.startSession();
        await session.withTransaction(async () => {
            await Shipment.deleteMany({ tenantId }, { session });
            await User.deleteMany({ tenantId }, { session });
            const deletedTenant = await Tenant.findByIdAndDelete(tenantId, { session });
            
            if (!deletedTenant) {
                throw new Error('Tenant not found');
            }
        });
        await session.endSession();
        
        return NextResponse.json({ message: 'Tenant and all associated data deleted successfully.' });
    } catch (error) {
        console.error('Deletion error:', error);
        // THIS IS THE 100% CORRECTED LINE
        return NextResponse.json({ message: 'Internal server error during deletion.' }, { status: 500 });
    }
}