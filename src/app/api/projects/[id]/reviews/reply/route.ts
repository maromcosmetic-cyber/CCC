import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { replyToGoogleReview } from '@/lib/integrations/google-business';
import { z } from 'zod';

const ReplySchema = z.object({
    reviewName: z.string(),
    replyText: z.string().min(1).max(4096),
});

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireAuth(request);
        if (authResult.response) return authResult.response;

        const projectId = params.id;
        const body = await request.json();
        const validated = ReplySchema.parse(body);

        const success = await replyToGoogleReview(
            projectId,
            validated.reviewName,
            validated.replyText
        );

        if (!success) {
            return NextResponse.json(
                { error: 'Failed to post reply. Please check your Google Business connection.' },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true, message: 'Reply posted successfully' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation error', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Error in reply API:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
