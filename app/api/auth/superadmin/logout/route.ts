// app/api/auth/superadmin/logout/route.ts

import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Create a response object
    const response = NextResponse.json({
      message: 'Logout successful',
      success: true,
    });

    // Set the cookie with an expiration date in the past to delete it
    response.cookies.set('token', '', {
      httpOnly: true,
      path: '/',
      maxAge: -1, // This is the key to deleting the cookie
    });

    return response;

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}