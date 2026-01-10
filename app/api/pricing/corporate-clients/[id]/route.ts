// app/api/pricing/corporate-clients/[id]/route.ts

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

// GET: Get a single corporate client
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!verifyAdminAccess(payload)) {
    return NextResponse.json({ message: 'Forbidden - Admin access required' }, { status: 403 });
  }

  try {
    const client = await CorporateClient.findById(params.id)
      .populate('createdBy', 'name email')
      .lean();

    if (!client) {
      return NextResponse.json({ message: 'Corporate client not found' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error('Error fetching corporate client:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update a corporate client
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!verifyAdminAccess(payload)) {
    return NextResponse.json({ message: 'Forbidden - Admin access required' }, { status: 403 });
  }

  try {
    const client = await CorporateClient.findById(params.id);
    if (!client) {
      return NextResponse.json({ message: 'Corporate client not found' }, { status: 404 });
    }

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

    // Update fields if provided
    if (companyName !== undefined) {
      const sanitized = sanitizeInput(companyName.trim(), 200);
      if (sanitized.length < 2) {
        return NextResponse.json(
          { message: 'Company name must be at least 2 characters' },
          { status: 400 }
        );
      }

      // Check if another client with same name exists
      const existingClient = await CorporateClient.findOne({
        companyName: sanitized,
        _id: { $ne: params.id },
      });
      if (existingClient) {
        return NextResponse.json(
          { message: 'Another client with this company name already exists' },
          { status: 409 }
        );
      }

      client.companyName = sanitized;
    }

    if (contactPerson !== undefined) {
      client.contactPerson = sanitizeInput(contactPerson.trim(), 100);
    }

    if (email !== undefined) {
      const sanitizedEmail = sanitizeInput(email.trim().toLowerCase(), 200);
      if (!isValidEmail(sanitizedEmail)) {
        return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
      }

      // Check if another client with same email exists
      const existingClient = await CorporateClient.findOne({
        email: sanitizedEmail,
        _id: { $ne: params.id },
      });
      if (existingClient) {
        return NextResponse.json(
          { message: 'Another client with this email already exists' },
          { status: 409 }
        );
      }

      client.email = sanitizedEmail;
    }

    if (phone !== undefined) {
      const sanitizedPhone = sanitizeInput(phone.trim(), 20);
      if (!isValidPhone(sanitizedPhone)) {
        return NextResponse.json({ message: 'Invalid phone format' }, { status: 400 });
      }
      client.phone = sanitizedPhone;
    }

    if (address !== undefined) {
      client.address = sanitizeInput(address.trim(), 500);
    }

    if (creditLimit !== undefined) {
      const creditLimitNum = parseFloat(creditLimit);
      if (isNaN(creditLimitNum) || creditLimitNum < 0) {
        return NextResponse.json(
          { message: 'Credit limit must be a valid non-negative number' },
          { status: 400 }
        );
      }
      client.creditLimit = creditLimitNum;
    }

    if (paymentTerms !== undefined) {
      client.paymentTerms = paymentTerms ? sanitizeInput(paymentTerms.trim(), 50) : undefined;
    }

    if (isActive !== undefined) {
      client.isActive = isActive;
    }

    await client.save();

    return NextResponse.json(client);
  } catch (error: any) {
    console.error('Error updating corporate client:', error);
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

// DELETE: Delete a corporate client
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!verifyAdminAccess(payload)) {
    return NextResponse.json({ message: 'Forbidden - Admin access required' }, { status: 403 });
  }

  try {
    const client = await CorporateClient.findByIdAndDelete(params.id);

    if (!client) {
      return NextResponse.json({ message: 'Corporate client not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Corporate client deleted successfully' });
  } catch (error) {
    console.error('Error deleting corporate client:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

