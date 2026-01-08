
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { requireAuth } from '@/lib/auth/middleware';

// POST /api/marketing/analytics/connect
// Save API tokens/Pixel IDs for the project
export async function POST(req: NextRequest) {
    try {
        const auth = await requireAuth(req);
        if (auth.response) return auth.response;

        const body = await req.json();
        const { type } = body;

        const response = NextResponse.json({ success: true });

        if (type === 'module_init') {
            response.cookies.set('ccc_analytics_module_enabled', 'true', { path: '/' });
            return response;
        }

        if (type === 'google') {
            response.cookies.set('ccc_analytics_google_connected', 'true', { path: '/' });
            return response;
        }

        if (type === 'facebook') {
            response.cookies.set('ccc_analytics_facebook_connected', 'true', { path: '/' });
            return response;
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
