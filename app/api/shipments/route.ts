// app/api/shipments/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shipment from '@/models/Shipment.model';
import User from '@/models/User.model';
import CorporateClient from '@/models/CorporateClient.model';
import { jwtVerify } from 'jose';
import { customAlphabet } from 'nanoid';
import { sanitizeInput, sanitizeObject, isValidEmail, isValidPhone, isValidAddress } from '@/lib/sanitize';
import { dispatchNotification } from '@/app/lib/notificationDispatcher';
import { calculateFinalPrice } from '@/lib/pricingCalculator';
import { getZonesForBranches, validateZoneAssignment } from '@/lib/zoneService';

// Helper to get the logged-in user's payload from their token
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

// GET: Fetch all shipments for the current tenant
export async function GET(request: NextRequest) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload || !payload.tenantId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if there's an assignedTo query parameter
    const { searchParams } = new URL(request.url);
    const assignedTo = searchParams.get('assignedTo');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    
    // Build query object
    const query: any = { tenantId: payload.tenantId };
    
    // If assignedTo parameter is provided, filter by it
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }
    
    // If date range is provided, filter by createdAt date
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      query.createdAt = {
        $gte: fromDate,
        $lt: toDate
      };
      console.log(`Filtering shipments from ${from} to ${to}`);
    }

    // CRUCIAL: Filter shipments by the tenantId from the user's token
    const shipments = await Shipment.find(query)
      .sort({ createdAt: -1 }) // Show newest first
      .populate('assignedTo', 'name email') // Later, this will fetch the driver's name
      .populate('createdBy', 'name role isManager');

    return NextResponse.json(shipments);
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new shipment within the current tenant
export async function POST(request: NextRequest) {
  await dbConnect();
  const payload = await getUserPayload(request);

  if (!payload || !payload.tenantId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  
  // Optional: Add a role check if only 'admin' can create shipments
  if (payload.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { 
      assignedTo, 
      originBranchId, 
      destinationBranchId, 
      paymentMethod,
      corporateClientId,
      ...shipmentData 
    } = body;

    // Sanitize all string inputs to prevent XSS
    const sanitized = sanitizeObject(shipmentData);

    // Validate email and phone formats
    if (sanitized.sender?.email && !isValidEmail(sanitized.sender.email)) {
      return NextResponse.json({ message: 'Invalid sender email format' }, { status: 400 });
    }
    if (sanitized.recipient?.email && !isValidEmail(sanitized.recipient.email)) {
      return NextResponse.json({ message: 'Invalid recipient email format' }, { status: 400 });
    }
    if (sanitized.sender?.phone && !isValidPhone(sanitized.sender.phone)) {
      return NextResponse.json({ message: 'Invalid sender phone format' }, { status: 400 });
    }
    if (sanitized.recipient?.phone && !isValidPhone(sanitized.recipient.phone)) {
      return NextResponse.json({ message: 'Invalid recipient phone format' }, { status: 400 });
    }
    if (sanitized.sender?.address && !isValidAddress(sanitized.sender.address)) {
      return NextResponse.json({ message: 'Invalid sender address (5-200 chars)' }, { status: 400 });
    }
    if (sanitized.recipient?.address && !isValidAddress(sanitized.recipient.address)) {
      return NextResponse.json({ message: 'Invalid recipient address (5-200 chars)' }, { status: 400 });
    }

    // Validate that branch IDs are provided
    if (!originBranchId || !destinationBranchId) {
      console.error('Missing branch IDs:', { originBranchId, destinationBranchId });
      return NextResponse.json(
        { message: 'originBranchId and destinationBranchId are required' },
        { status: 400 }
      );
    }

    // Validate weight is provided for pricing
    const weight = sanitized.packageInfo?.weight;
    if (!weight || weight <= 0) {
      return NextResponse.json(
        { message: 'Package weight is required and must be greater than 0' },
        { status: 400 }
      );
    }

    // Calculate price if weight is provided
    let pricing: any = undefined;
    try {
      // Get zones for both branches
      const zones = await getZonesForBranches(originBranchId, destinationBranchId);

      if (!zones.originZoneId || !zones.destinationZoneId) {
        // Validate zone assignment
        const validation = await validateZoneAssignment(originBranchId, destinationBranchId);
        return NextResponse.json(
          {
            message: 'Zone assignment error. Both branches must have zones assigned.',
            errors: validation.errors,
            warnings: validation.warnings,
          },
          { status: 400 }
        );
      }

      // Calculate final price
      const priceResult = await calculateFinalPrice(
        weight,
        zones.originZoneId,
        zones.destinationZoneId
      );

      pricing = {
        basePrice: priceResult.basePrice,
        zoneSurcharge: priceResult.zoneSurcharge,
        finalPrice: priceResult.finalPrice,
        calculatedAt: new Date(),
      };
    } catch (error: any) {
      console.error('Price calculation error:', error);
      return NextResponse.json(
        { message: `Price calculation failed: ${error.message}` },
        { status: 400 }
      );
    }

    // Validate payment method if provided
    if (paymentMethod && !['prepaid', 'postpaid'].includes(paymentMethod)) {
      return NextResponse.json(
        { message: 'Payment method must be either "prepaid" or "postpaid"' },
        { status: 400 }
      );
    }

    // Validate corporate client if postpaid
    if (paymentMethod === 'postpaid') {
      if (!corporateClientId) {
        return NextResponse.json(
          { message: 'Corporate client ID is required for postpaid shipments' },
          { status: 400 }
        );
      }

      // Verify corporate client exists and is active
      const corporateClient = await CorporateClient.findById(corporateClientId);
      if (!corporateClient) {
        return NextResponse.json(
          { message: 'Corporate client not found' },
          { status: 404 }
        );
      }

      if (!corporateClient.isActive) {
        return NextResponse.json(
          { message: 'Corporate client is not active' },
          { status: 400 }
        );
      }

      // Check credit limit if applicable
      if (corporateClient.creditLimit && pricing) {
        const newOutstanding = (corporateClient.outstandingAmount || 0) + pricing.finalPrice;
        if (newOutstanding > corporateClient.creditLimit) {
          return NextResponse.json(
            {
              message: `Credit limit exceeded. Current outstanding: ₹${corporateClient.outstandingAmount || 0}, Credit limit: ₹${corporateClient.creditLimit}, Shipment price: ₹${pricing.finalPrice}`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Generate a unique, human-readable tracking ID
    const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 10);
    const trackingId = `TRK-${nanoid()}`;

    // Determine payment status
    let paymentStatus: 'pending' | 'paid' | 'collected' | 'billed' = 'pending';
    if (paymentMethod === 'prepaid') {
      paymentStatus = 'pending'; // Will be collected at delivery
    } else if (paymentMethod === 'postpaid') {
      paymentStatus = 'billed'; // Billed to corporate client
    }

    // Create the new shipment with sanitized data
    const newShipment = new Shipment({
      ...sanitized,
      trackingId: trackingId,
      createdBy: payload.userId || payload.id || payload.sub,
      status: 'At Origin Branch', // Set initial status
      tenantId: payload.tenantId, // CRUCIAL: Assign the creator's tenantId (current/origin branch)
      originBranchId, // The branch where this shipment was created
      destinationBranchId, // The final destination
      currentBranchId: payload.tenantId, // Initially, the shipment is at the origin branch
      statusHistory: [{ status: 'At Origin Branch', timestamp: new Date() }], // Start the history log
      ...(assignedTo && { assignedTo }), // Add assignedTo if provided
      pricing, // Add pricing breakdown
      paymentMethod, // Add payment method
      paymentStatus, // Add payment status
      ...(corporateClientId && { corporateClientId }), // Add corporate client if postpaid
    });

    await newShipment.save();

    // Update corporate client outstanding amount if postpaid
    if (paymentMethod === 'postpaid' && corporateClientId && pricing) {
      await CorporateClient.findByIdAndUpdate(corporateClientId, {
        $inc: { outstandingAmount: pricing.finalPrice },
      });
    }
    
    // Dispatch 'shipment_created' notification
    await dispatchNotification({
      event: 'shipment_created',
      shipmentId: newShipment._id.toString(),
      trackingId: newShipment.trackingId,
      tenantId: payload.tenantId as string,
      createdBy: (payload.userId || payload.id || payload.sub) as string,
    } as any).catch(err => {
      console.error('Error dispatching shipment_created notification:', err);
    });
    
    return NextResponse.json(newShipment, { status: 201 });

  } catch (error: any) {
    // Handle validation errors from Mongoose
    if (error.name === 'ValidationError') {
      return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}