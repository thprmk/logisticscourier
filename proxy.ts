// proxy.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get('token')?.value;
  const loginUrl = new URL('/login', request.url);

  // Allow essential Next.js assets to pass through without checks
  if (path.startsWith('/_next') || path.startsWith('/favicon.ico')) {
    return NextResponse.next();
  }
  
  // Also allow API routes to pass, as they have their own security
  if (path.startsWith('/api')) {
    return NextResponse.next();
  }

  // Handle logged-out users
  if (!token) {
    // If not logged in, they can only be on the login page
    if (path !== '/login') {
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Handle logged-in users
  let payload;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const verified = await jwtVerify(token, secret);
    payload = verified.payload;
  } catch (err) {
    // Invalid token, clear it and force login
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('token');
    return response;
  }

  // --- THIS IS THE NEW, CRITICAL PART ---
  // The user is valid. We will now add their details to the request headers
  // so that Server Components down the line can read them.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId as string);
  requestHeaders.set('x-user-role', payload.role as string);
  if (payload.tenantId) {
    requestHeaders.set('x-tenant-id', payload.tenantId as string);
  }

  // We must clone the request to set the new headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  // --- END OF NEW PART ---

  // Now, handle redirects based on role
  const isSuperAdmin = payload.role === 'superAdmin';

  if (isSuperAdmin) {
    // If a super admin tries to access the general login or tenant dashboard,
    // send them to their own dashboard.
    if (path === '/login' || path.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/superadmin/dashboard', request.url));
    }
  } else {
    // If a tenant user tries to access the general login or super admin pages,
    // send them to their own dashboard.
    if (path === '/login' || path.startsWith('/superadmin')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  // If no redirect is needed, return the response with the added headers
  return response;
}

export const config = {
  // Run this proxy on every route
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};