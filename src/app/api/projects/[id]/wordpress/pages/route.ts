import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { fetchAllWordPressPages, createWordPressPage } from '@/lib/integrations/wordpress';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireAuth(request);
        if (authResult.response) return authResult.response;

        const projectId = params.id;

        // Fetch all pages from WordPress
        const pages = await fetchAllWordPressPages(projectId);

        if (!pages) {
            return NextResponse.json({ error: 'Failed to fetch WordPress pages' }, { status: 500 });
        }

        return NextResponse.json({ pages });
    } catch (error) {
        console.error('Error in WordPress pages API:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireAuth(request);
        if (authResult.response) return authResult.response;

        const projectId = params.id;
        const body = await request.json();
        const { title, content, slug } = body;

        const pageId = await createWordPressPage(projectId, title, content, slug);

        if (!pageId) {
            return NextResponse.json({ error: 'Failed to create WordPress page' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Page created successfully',
            page_id: pageId,
        });
    } catch (error) {
        console.error('Error creating WordPress page:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
