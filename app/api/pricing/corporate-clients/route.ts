// app/api/pricing/corporate-clients/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import CorporateClient from '@/models/CorporateClient.model';
import { jwtVerify } from 'jose';
import { sanitizeInput, sanitizeObject, isValidEmail, isValidPhone } from '@/lib/sanitize';

// Helper to get user payload
async function getUserPayload(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as any;
  } catch (error) {
    return null;
  }
}

// Helper to verify admin or superAdmin access
function verifyAdminAccess(payload: any) {
  return payload && (payload.role === 'admin' || payload.role === 'superAdmin');
}

// GET: List all corporate clients
export async function GET(request: NextRequest) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Admin and superAdmin can view corporate clients
  if (!verifyAdminAccess(payload)) {
    return NextResponse.json({ message: 'Forbidden - Admin access required' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const query: any = {};
    if (!includeInactive) {
      query.isActive = true;
    }

    const clients = await CorporateClient.find(query)
      .sort({ companyName: 1 })
      .populate('createdBy', 'name email')
      .lean();

    return NextResponse.json(clients);
  } catch (error) {
    console.error('Error fetching corporate clients:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new corporate client
export async function POST(request: NextRequest) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Admin and superAdmin can create corporate clients
  if (!verifyAdminAccess(payload)) {
    return NextResponse.json({ message: 'Forbidden - Admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      companyName,
      contactPerson,
      email,
      phone,
      address,
      creditLimit,
      paymentTerms,
      isActive,
    } = body;

    // Validate required fields
    if (!companyName || !contactPerson || !email || !phone || !address) {
      return NextResponse.json(
        { message: 'companyName, contactPerson, email, phone, and address are required' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitized = sanitizeObject({
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      address: address.trim(),
      paymentTerms: paymentTerms?.trim(),
    });

    // Validate email
    if (!isValidEmail(sanitized.email)) {
      return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
    }

    // Validate phone
    if (!isValidPhone(sanitized.phone)) {
      return NextResponse.json({ message: 'Invalid phone format' }, { status: 400 });
    }

    // Validate credit limit if provided
    let creditLimitNum: number | undefined;
    if (creditLimit !== undefined) {
      creditLimitNum = parseFloat(creditLimit);
      if (isNaN(creditLimitNum) || creditLimitNum < 0) {
        return NextResponse.json(
          { message: 'Credit limit must be a valid non-negative number' },
          { status: 400 }
        );
      }
    }

    // Check if client with same company name or email already exists
    const existingClient = await CorporateClient.findOne({
      $or: [{ companyName: sanitized.companyName }, { email: sanitized.email }],
    });

    if (existingClient) {
      return NextResponse.json(
        { message: 'Corporate client with this company name or email already exists' },
        { status: 409 }
      );
    }

    // Create new corporate client
    const newClient = new CorporateClient({
      companyName: sanitized.companyName,
      contactPerson: sanitized.contactPerson,
      email: sanitized.email,
      phone: sanitized.phone,
      address: sanitized.address,
      creditLimit: creditLimitNum,
      paymentTerms: sanitized.paymentTerms,
      outstandingAmount: 0,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: payload.id || payload.userId || payload.sub,
    });

    await newClient.save();

    return NextResponse.json(newClient, { status: 201 });
  } catch (error: any) {
    console.error('Error creating corporate client:', error);
    if (error.name === 'ValidationError') {
      return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    if (error.code === 11000) {
      return NextResponse.json(
        { message: 'Corporate client with this company name or email already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

