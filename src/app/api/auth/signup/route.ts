// Sign up API route - handles server-side signup and sets cookies

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = SignUpSchema.parse(body);

    // Use regular Supabase client (not SSR) for authentication
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Trim email
    const trimmedEmail = validated.email.trim().toLowerCase();

    console.log('[Signup API] Attempting signup for:', trimmedEmail);

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: validated.password,
      options: {
        data: {
          name: validated.name || trimmedEmail.split('@')[0],
        },
      },
    });

    if (error) {
      console.log('[Signup API] Error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('[Signup API] Success! User:', data.user?.email);
    console.log('[Signup API] Session exists:', !!data.session);

    // Create response
    const response = NextResponse.json({
      user: data.user,
      session: data.session,
    });

    // If session exists (email confirmation disabled), set auth cookie
    if (data.session) {
      const cookieOptions = {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        sameSite: 'lax' as const,
        secure: process.env.NODE_ENV === 'production',
      };

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

      console.log('[Signup API] Set auth cookie: sb-' + projectRef + '-auth-token');
    }

    return response;
  } catch (error) {
    console.error('[Signup API] Exception:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
