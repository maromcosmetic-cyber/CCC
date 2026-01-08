import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { fetchGoogleReviews } from '@/lib/integrations/google-business';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireAuth(request);
        if (authResult.response) return authResult.response;

        const projectId = params.id;
        const searchParams = request.nextUrl.searchParams;
        const pageSize = parseInt(searchParams.get('pageSize') || '50');

        const reviews = await fetchGoogleReviews(projectId, pageSize);

        if (reviews === null) {
            return NextResponse.json(
                { error: 'Failed to fetch reviews. Please ensure Google Business is connected with valid credentials.' },
                { status: 400 }
            );
        }

        return NextResponse.json({ reviews });
    } catch (error) {
        console.error('Error in reviews API:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
