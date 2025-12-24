// app/api/superadmin/stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User.model';
import Shipment from '@/models/Shipment.model';
import { jwtVerify } from 'jose';

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

  const superAdminPayload = await verifySuperAdmin(request);
  if (!superAdminPayload) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build query objects for filtering
    // Total Staff includes: delivery staff (role='staff'), dispatchers (role='admin', isManager=false), and branch admins/managers (role='admin', isManager=true)
    // Exclude superAdmin
    const userQuery: any = { 
      role: { $in: ['admin', 'staff'] } // Include both admin and staff roles, exclude superAdmin
    };
    const shipmentQuery: any = {};

    // Filter by branch if specified (works for both specific branch and "all")
    if (branchId && branchId !== 'all') {
      userQuery.tenantId = branchId;
      shipmentQuery.tenantId = branchId;
    }
    // If branchId is 'all' or not provided, don't filter by tenantId (show all branches)

    // Filter by date range if specified (works with or without branch filter)
    if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      
      // Validate dates
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return NextResponse.json({ message: 'Invalid date format' }, { status: 400 });
      }
      
      // Set time boundaries for accurate date range filtering
      fromDate.setHours(0, 0, 0, 0); // Start of the day
      toDate.setHours(23, 59, 59, 999); // End of the day
      
      shipmentQuery.createdAt = {
        $gte: fromDate,
        $lte: toDate
      };
    }
    // If no date range provided, don't filter by date (show all time)

    // Fetch staff count with filters (staff count is not affected by date range)
    const totalStaff = await User.countDocuments(userQuery);

    // Fetch delivered shipments with filters (combines branch + date range if both are set)
    const deliveredQuery = { ...shipmentQuery, status: 'Delivered' };
    const deliveredCount = await Shipment.countDocuments(deliveredQuery);

    // Fetch failed shipments with filters (combines branch + date range if both are set)
    const failedQuery = { ...shipmentQuery, status: 'Failed' };
    const failedCount = await Shipment.countDocuments(failedQuery);

    return NextResponse.json({
      totalStaff,
      deliveredCount,
      failedCount,
    });
  } catch (error) {
    console.error('Error fetching super admin stats:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

