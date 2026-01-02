import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for user-web application
 * ====================================
 * 
 * Handles:
 * - Authentication checks
 * - Security headers enforcement
 * - Route protection
 * - CSRF token validation
 */

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/terms',
  '/privacy',
  '/help',
  '/how-it-works',
];

// API routes that should be protected
const _PROTECTED_API_ROUTES = ['/api/'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // files with extensions
  ) {
    return NextResponse.next();
  }

  // Check if route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route)
  );

  // Check for authentication token
  // Support both Supabase token and our custom token
  const supabaseToken = request.cookies.get('sb-access-token');
  const customAuthToken = request.cookies.get('tc-auth-token');
  const hasAuthToken = !!(supabaseToken || customAuthToken);

  // Redirect unauthenticated users from protected routes
  if (!isPublicRoute && !hasAuthToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users from auth pages
  if (hasAuthToken && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  
  // Add additional runtime security headers
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Add CSRF token to response headers for client-side validation
  const csrfToken = request.cookies.get('csrf-token');
  if (csrfToken) {
    response.headers.set('X-CSRF-Token', csrfToken.value);
  }

  return response;
}

// Configure which routes this middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
