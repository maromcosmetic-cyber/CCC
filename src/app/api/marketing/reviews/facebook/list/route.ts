
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';

// GET /api/marketing/reviews/facebook/list
export async function GET(req: NextRequest) {
    try {
        const auth = await requireAuth(req);
        if (auth.response) return auth.response;

        if (req.nextUrl.searchParams.get('check_status') === 'true') {
            const isConnected = req.cookies.get('facebook_connected')?.value === 'true';
            return NextResponse.json({
                connected: isConnected,
                reviews: isConnected ? getMockReviews() : []
            });
        }

        return NextResponse.json({ reviews: getMockReviews() });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function getMockReviews() {
    return [
        {
            id: 'fb1',
            author: 'Mike Ross',
            starRating: 5,
            comment: 'Great service and fast delivery!',
            createTime: new Date(Date.now() - 40000000).toISOString(),
            reply: null
        },
        {
            id: 'fb2',
            author: 'Rachel Green',
            starRating: 3,
            comment: 'Item was okay, but packaging was damaged.',
            createTime: new Date(Date.now() - 200000000).toISOString(),
            reply: {
                comment: 'Hi Rachel, sorry to hear that! Please DM us.',
                updateTime: new Date(Date.now() - 10000000).toISOString()
            }
        }
    ];
}
