// Sign in API route - handles server-side signin and sets cookies properly

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = SignInSchema.parse(body);

    // Use regular Supabase client (not SSR) for authentication
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Trim and lowercase email
    const trimmedEmail = validated.email.trim().toLowerCase();

    console.log('[Signin API] Attempting signin for:', trimmedEmail);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: validated.password,
    });

    if (error) {
      console.log('[Signin API] Error:', error.message);
      let errorMessage = error.message;
      if (error.message === 'Invalid login credentials') {
        errorMessage = 'Invalid email or password. Please check your credentials or reset your password.';
      }
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }

    if (!data.session) {
      console.log('[Signin API] No session returned');
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    console.log('[Signin API] Success! User:', data.user?.email);

    // Create response
    const response = NextResponse.json({
      user: data.user,
      session: data.session,
    });

    // Set session cookies with proper Supabase cookie names
    // Supabase uses these specific cookie names for SSR
    const cookieOptions = {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
    };

    // Set the auth token cookies that Supabase SSR expects
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!.split('//')[1].split('.')[0];

    response.cookies.set(
      `sb-${projectRef}-auth-token`,
      JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
        token_type: 'bearer',
        user: data.user,
      }),
      cookieOptions
    );

    console.log('[Signin API] Set auth cookie: sb-' + projectRef + '-auth-token');

    return response;
  } catch (error) {
    console.error('[Signin API] Exception:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
