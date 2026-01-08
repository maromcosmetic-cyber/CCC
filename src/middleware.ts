// Next.js middleware for auth protection

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/', '/studio', '/brand', '/catalog', '/results', '/projects'];

// Routes that are only for unauthenticated users
const authRoutes = ['/auth/login', '/auth/signup', '/auth/reset-password'];

export async function middleware(request: NextRequest) {
  console.log('[Middleware] Processing request:', request.nextUrl.pathname);

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: any) {
          cookiesToSet.forEach(({ name, value }: any) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }: any) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log('[Middleware] User check:', {
    hasUser: !!user,
    userId: user?.id,
    pathname: request.nextUrl.pathname
  });

  // Fallback: Check for manually-set auth cookie if SSR client didn't find user
  let validSession = !!user;
  if (!validSession) {
    try {
      const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!.split('//')[1].split('.')[0];
      const authCookie = request.cookies.get(`sb-${projectRef}-auth-token`);
      if (authCookie) {
        const authData = JSON.parse(authCookie.value);
        if (authData.access_token && authData.expires_at) {
          const expiresAt = authData.expires_at * 1000;
          if (expiresAt > Date.now()) {
            validSession = true;
            console.log('[Middleware] Fallback: Valid session found in manual cookie');
          }
        }
      }
    } catch (e) {
      console.log('[Middleware] Fallback check failed:', e);
    }
  }

  const pathname = request.nextUrl.pathname;

  // Check if current route requires authentication
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );

  // Check if current route is an auth route (login, signup, etc.)
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  console.log('[Middleware] Route check:', {
    isProtectedRoute,
    isAuthRoute,
    hasUser: !!user,
    validSession
  });

  // Redirect unauthenticated users to login for protected routes
  if (!validSession && isProtectedRoute) {
    console.log('[Middleware] Redirecting to login - no valid session for protected route');
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Redirect authenticated users away from auth pages to studio
  if (validSession && isAuthRoute) {
    console.log('[Middleware] Redirecting to studio - user already authenticated');
    return NextResponse.redirect(new URL('/studio/overview', request.url));
  }

  console.log('[Middleware] Allowing request to proceed');
  return response;
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

