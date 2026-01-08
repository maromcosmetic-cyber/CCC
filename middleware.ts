// Next.js middleware for auth protection

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Routes that require authentication
const protectedRoutes = ['/', '/studio', '/brand', '/catalog', '/results', '/projects'];

// Routes that are only for unauthenticated users
const authRoutes = ['/auth/login', '/auth/signup', '/auth/reset-password'];

export async function middleware(request: NextRequest) {
  console.log('[Middleware] Processing request:', request.nextUrl.pathname);

  const pathname = request.nextUrl.pathname;

  // Check if current route requires authentication
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );

  // Check if current route is an auth route (login, signup, etc.)
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // Get the auth cookie
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!.split('//')[1].split('.')[0];
  const authCookie = request.cookies.get(`sb-${projectRef}-auth-token`);

  let user = null;

  if (authCookie) {
    try {
      const authData = JSON.parse(authCookie.value);

      // Verify the token is still valid
      if (authData.access_token && authData.expires_at) {
        const expiresAt = authData.expires_at * 1000; // Convert to milliseconds
        const now = Date.now();

        if (expiresAt > now) {
          // Token is still valid
          user = authData.user;
          console.log('[Middleware] User authenticated:', user?.email);
        } else {
          console.log('[Middleware] Token expired');
        }
      }
    } catch (err) {
      console.error('[Middleware] Error parsing auth cookie:', err);
    }
  }

  console.log('[Middleware] Route check:', {
    isProtectedRoute,
    isAuthRoute,
    hasUser: !!user,
    pathname
  });

  // Redirect unauthenticated users to login for protected routes
  if (!user && isProtectedRoute) {
    console.log('[Middleware] Redirecting to login - no user for protected route');
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Redirect authenticated users away from auth pages to studio
  if (user && isAuthRoute) {
    console.log('[Middleware] Redirecting to studio - user already authenticated');
    return NextResponse.redirect(new URL('/studio/overview', request.url));
  }

  console.log('[Middleware] Allowing request to proceed');
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
