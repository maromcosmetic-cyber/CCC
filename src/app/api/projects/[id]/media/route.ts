
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Auth check
        const auth = await requireAuth(request);
        if (auth.response) return auth.response;
        const userId = auth.user.id;

        const projectId = params.id;
        const { searchParams } = new URL(request.url);
        const audienceId = searchParams.get('audienceId');
        const personaName = searchParams.get('personaName');
        const limit = parseInt(searchParams.get('limit') || '100');
        const offset = parseInt(searchParams.get('offset') || '0');

        const supabaseAdmin = createServiceRoleClient();

        // 1. Verify Ownership (Manual RLS)
        const { data: project, error: projectError } = await supabaseAdmin
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (projectError || !project) {
            console.error('Access denied or project not found found:', { projectId, userId });
            return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
        }

        // 2. Fetch Media (Bypass RLS)
        let query = supabaseAdmin
            .from('media_assets')
            .select('id, storage_url, storage_path, storage_bucket, image_type, persona_name, audience_id, project_id, approved, created_at')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (audienceId) {
            query = query.eq('audience_id', audienceId);
        } else if (personaName) {
            query = query.eq('persona_name', personaName);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching media:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ media: data });
    } catch (error: any) {
        console.error('Media API error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
