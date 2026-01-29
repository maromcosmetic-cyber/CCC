import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { supabase } from '@/lib/db/client';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireAuth(request);
        if (authResult.response) return authResult.response;

        const projectId = params.id;

        const { data: pages, error } = await supabase
            .from('legal_pages')
            .select('*')
            .eq('project_id', projectId)
            .order('page_type');

        if (error) {
            console.error('Error fetching legal pages:', error);
            return NextResponse.json({ error: 'Failed to fetch legal pages' }, { status: 500 });
        }

        return NextResponse.json({ pages: pages || [] });
    } catch (error) {
        console.error('Error in legal pages API:', error);
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
        const { page_type, title, content, wordpress_slug, wordpress_page_id } = body;

        const { data, error } = await supabase
            .from('legal_pages')
            .upsert({
                project_id: projectId,
                page_type,
                title,
                content,
                wordpress_slug,
                wordpress_page_id,
                updated_at: new Date().toISOString(),
            } as any, {
                onConflict: 'project_id,page_type'
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving legal page:', error);
            return NextResponse.json({ error: 'Failed to save legal page' }, { status: 500 });
        }

        return NextResponse.json({ page: data });
    } catch (error) {
        console.error('Error in legal pages API:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
