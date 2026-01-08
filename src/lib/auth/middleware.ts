// Auth middleware for API routes

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export async function requireAuth(request: NextRequest) {
  try {
    // Get the auth cookie (custom format we set in signin/signup)
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!.split('//')[1].split('.')[0];
    const authCookie = request.cookies.get(`sb-${projectRef}-auth-token`);

    console.log('[Auth Middleware] Auth cookie exists:', !!authCookie);

    if (!authCookie) {
      return {
        user: null,
        supabase: null,
        error: 'Unauthorized',
        response: NextResponse.json({ error: 'Unauthorized - No auth cookie' }, { status: 401 }),
      };
    }

    let authData;
    try {
      authData = JSON.parse(authCookie.value);
    } catch (parseError) {
      console.error('[Auth Middleware] Error parsing auth cookie:', parseError);
      return {
        user: null,
        supabase: null,
        error: 'Unauthorized',
        response: NextResponse.json({ error: 'Unauthorized - Invalid auth cookie' }, { status: 401 }),
      };
    }

    // Check if token is still valid
    if (authData.expires_at) {
      const expiresAt = authData.expires_at * 1000;
      const now = Date.now();

      if (expiresAt <= now) {
        return {
          user: null,
          supabase: null,
          error: 'Unauthorized',
          response: NextResponse.json({ error: 'Unauthorized - Token expired' }, { status: 401 }),
        };
      }
    }

    const user = authData.user;
    console.log('[Auth Middleware] User authenticated:', user?.email);

    // Create a Supabase client with the user's access token
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${authData.access_token}`,
          },
        },
      }
    );

    return {
      user,
      supabase,
      error: null,
      response: null,
    };
  } catch (error) {
    console.error('[Auth Middleware] Exception:', error);
    return {
      user: null,
      supabase: null,
      error: 'Unauthorized',
      response: NextResponse.json({ error: 'Unauthorized - Exception' }, { status: 401 }),
    };
  }
}
