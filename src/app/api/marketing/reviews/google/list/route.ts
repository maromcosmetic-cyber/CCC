
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';

// GET /api/marketing/reviews/google/list
export async function GET(req: NextRequest) {
    try {
        const auth = await requireAuth(req);
        if (auth.response) return auth.response;

        if (req.nextUrl.searchParams.get('check_status') === 'true') {
            // Mock: Default to DISCONNECTED for demo to show prompt
            // In real app, check db for 'marketing_settings' -> google_connected
            // For this demo flow:
            // - If 'connected' cookie or param not set, return false
            // - I'll default to FALSE to satisfy user request "show connect screen first"

            // Check for a cookie or header set by the connect Action? 
            // Simplest: Check if a cookie "google_connected" exists
            const isConnected = req.cookies.get('google_connected')?.value === 'true';

            return NextResponse.json({
                connected: isConnected,
                reviews: isConnected ? getMockReviews() : []
            });
        }

        // Standard List Call
        return NextResponse.json({ reviews: getMockReviews() });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function getMockReviews() {
    return [
        {
            id: 'r1',
            author: 'Jane Doe',
            starRating: 5,
            comment: 'Amazing products! Highly recommended.',
            createTime: new Date(Date.now() - 86400000).toISOString(),
            reply: null
        },
        {
            id: 'r2',
            author: 'John Smith',
            starRating: 4,
            comment: 'Good quality but shipping was a bit slow.',
            createTime: new Date(Date.now() - 172800000).toISOString(),
            reply: {
                comment: 'Thanks John! We are working on improving our shipping times.',
                updateTime: new Date(Date.now() - 100000000).toISOString()
            }
        },
        {
            id: 'r3',
            author: 'Alice Johnson',
            starRating: 5,
            comment: 'Love the new collection!',
            createTime: new Date(Date.now() - 250000000).toISOString(),
            reply: null
        }
    ];
}
