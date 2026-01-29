import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { supabase } from '@/lib/db/client';
import { fetchWordPressPage, updateWordPressPage, createWordPressPage } from '@/lib/integrations/wordpress';

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

        // Check if page exists in WordPress
        let wordpressPageId = page.wordpress_page_id;

        if (!wordpressPageId && page.wordpress_slug) {
            const wpPage = await fetchWordPressPage(projectId, page.wordpress_slug);
            if (wpPage) {
                wordpressPageId = wpPage.id;
            }
        }

        let success = false;
        let error = null;

        if (wordpressPageId) {
            // Update existing page
            success = await updateWordPressPage(projectId, wordpressPageId, page.title, page.content);
            if (!success) {
                error = 'Failed to update WordPress page';
            }
        } else if (page.wordpress_slug) {
            // Create new page
            const newPageId = await createWordPressPage(projectId, page.title, page.content, page.wordpress_slug);
            if (newPageId) {
                wordpressPageId = newPageId;
                success = true;
            } else {
                error = 'Failed to create WordPress page';
            }
        } else {
            error = 'WordPress slug is required';
        }

        // Update sync status
        await supabase
            .from('legal_pages')
            // @ts-ignore
            .update({
                wordpress_page_id: wordpressPageId,
                last_synced_at: success ? new Date().toISOString() : page.last_synced_at,
                sync_status: success ? 'synced' : 'error',
                sync_error: error,
            })
            .eq('id', pageId);

        if (!success) {
            return NextResponse.json({ error: error || 'Sync failed' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Page synced successfully',
            wordpress_page_id: wordpressPageId
        });
    } catch (error) {
        console.error('Error syncing legal page:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
