import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { supabase } from '@/lib/db/client';
import { fetchWordPressPage } from '@/lib/integrations/wordpress';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string; pageId: string } }
) {
    try {
        const authResult = await requireAuth(request);
        if (authResult.response) return authResult.response;

        const projectId = params.id;
        const pageId = params.pageId;

        // Get the legal page
        const { data: pageData, error: pageError } = await supabase
            .from('legal_pages')
            .select('*')
            .eq('id', pageId)
            .eq('project_id', projectId)
            .single();

        const page = pageData as any;

        if (pageError || !page) {
            return NextResponse.json({ error: 'Legal page not found' }, { status: 404 });
        }

        if (!page.wordpress_slug) {
            return NextResponse.json({ error: 'WordPress slug is required' }, { status: 400 });
        }

        // Fetch page from WordPress
        const wpPage = await fetchWordPressPage(projectId, page.wordpress_slug);

        if (!wpPage) {
            return NextResponse.json({ error: 'Page not found on WordPress' }, { status: 404 });
        }

        // Update local page with WordPress content
        const { data: updatedPage, error: updateError } = await supabase
            .from('legal_pages')
            // @ts-ignore
            .update({
                title: wpPage.title.rendered,
                content: wpPage.content.rendered,
                wordpress_page_id: wpPage.id,
                last_synced_at: new Date().toISOString(),
                sync_status: 'synced',
            })
            .eq('id', pageId)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating page:', updateError);
            return NextResponse.json({ error: 'Failed to update page' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Page imported from WordPress successfully',
            page: updatedPage,
        });
    } catch (error) {
        console.error('Error importing from WordPress:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
