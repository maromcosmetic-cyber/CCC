// Get current user API route

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Get the auth cookie
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!.split('//')[1].split('.')[0];
    const cookieStore = cookies();
    const authCookie = cookieStore.get(`sb-${projectRef}-auth-token`);

    if (!authCookie) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    try {
      const authData = JSON.parse(authCookie.value);

      // Check if token is still valid
      if (authData.expires_at) {
        const expiresAt = authData.expires_at * 1000;
        const now = Date.now();

        if (expiresAt > now) {
          // Token is valid, return user data
          return NextResponse.json({
            user: authData.user,
          });
        }
      }
    } catch (parseError) {
      console.error('[Get User API] Error parsing auth cookie:', parseError);
    }

    return NextResponse.json({ user: null }, { status: 200 });
  } catch (error) {
    console.error('[Get User API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
