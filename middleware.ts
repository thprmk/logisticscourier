// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Define the secret key for JWT verification
const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

/**
 * JWT Payload Interface
 */
interface JWTPayload {
  userId: string;
  role: string;
  tenantId?: string;
  iat?: number;
  exp?: number;
}

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = ['/login', '/superadmin/login', '/', '/~offline'];

/**
 * Admin-only routes (superadmin dashboard)
 */
const SUPERADMIN_ROUTES = ['/superadmin'];

/**
 * Protected routes that require authentication
 */
const PROTECTED_ROUTES = ['/dashboard', '/deliverystaff'];

/**
 * Check if a route is public
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

/**
 * Check if a route is for superadmin only
 */
function isSuperAdminRoute(pathname: string): boolean {
  return SUPERADMIN_ROUTES.some((route) => pathname.startsWith(route + '/'));
}

/**
 * Check if a route is protected
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Verify JWT token and extract payload
 */
async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Log incoming request
  console.log(`[Middleware] Processing request to: ${pathname}`);

  // Allow API routes to pass through without authentication
  // API routes handle their own authentication
  if (pathname.startsWith('/api')) {
    console.log(`[Middleware] API route, allowing access: ${pathname}`);
    return NextResponse.next();
  }

  // Allow public routes without authentication
  if (isPublicRoute(pathname)) {
    console.log(`[Middleware] Public route, allowing access: ${pathname}`);
    return NextResponse.next();
  }

  // Get token from cookies
  const token = request.cookies.get('token')?.value;

  // If no token exists for protected routes, redirect to login
  if (!token) {
    console.log(`[Middleware] No token found for protected route: ${pathname}`);

    if (isSuperAdminRoute(pathname)) {
      // Redirect to superadmin login
      return NextResponse.redirect(new URL('/superadmin/login', request.url));
    }

    // Redirect to regular login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify token
  const payload = await verifyToken(token);

  if (!payload) {
    console.log(`[Middleware] Invalid or expired token for route: ${pathname}`);

    // Clear the invalid token
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');

    return response;
  }

  // Token is valid, proceed with role-based checks
  console.log(`[Middleware] Token verified for user: ${payload.userId}, role: ${payload.role}`);

  // Prevent regular users from accessing superadmin routes
  if (isSuperAdminRoute(pathname) && payload.role !== 'superAdmin') {
    console.log(`[Middleware] Access denied - user role '${payload.role}' cannot access superadmin route: ${pathname}`);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Prevent superadmin from accessing regular admin/staff routes
  if (!isSuperAdminRoute(pathname) && payload.role === 'superAdmin') {
    console.log(`[Middleware] Superadmin trying to access regular route: ${pathname}, redirecting to superadmin dashboard`);
    return NextResponse.redirect(new URL('/superadmin/dashboard', request.url));
  }

  // Clone the request headers
  const requestHeaders = new Headers(request.headers);

  // Add user information to request headers for API routes to access
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-role', payload.role);
  if (payload.tenantId) {
    requestHeaders.set('x-tenant-id', payload.tenantId);
  }

  console.log(`[Middleware] Access granted to: ${pathname}`);

  // Continue to the next middleware/handler
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  // Match all routes except static files, images, and next assets
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox).*)',
  ],
};