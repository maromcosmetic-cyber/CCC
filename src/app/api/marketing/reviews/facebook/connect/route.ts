
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';

// POST /api/marketing/reviews/facebook/connect
export async function POST(req: NextRequest) {
    try {
        const auth = await requireAuth(req);
        if (auth.response) return auth.response;

        // Set a cookie to simulate persistence
        const response = NextResponse.json({ success: true, message: "Connected to Facebook Page" });
        response.cookies.set('facebook_connected', 'true', { path: '/' });

        return response;

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
