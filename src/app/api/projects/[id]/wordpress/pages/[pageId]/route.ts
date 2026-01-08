import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { updateWordPressPage } from '@/lib/integrations/wordpress';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string; pageId: string } }
) {
    try {
        const authResult = await requireAuth(request);
        if (authResult.response) return authResult.response;

        const projectId = params.id;
        const pageId = parseInt(params.pageId);
        const body = await request.json();
        const { title, content } = body;

        const success = await updateWordPressPage(projectId, pageId, title, content);

        if (!success) {
            return NextResponse.json({ error: 'Failed to update WordPress page' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Page updated successfully',
        });
    } catch (error) {
        console.error('Error updating WordPress page:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
