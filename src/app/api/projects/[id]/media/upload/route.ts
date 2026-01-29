
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/middleware';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireAuth(request);
        if (auth.response) return auth.response;
        const userId = auth.user.id;

        const projectId = params.id;
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const supabaseAdmin = createServiceRoleClient();

        // 1. Verify Ownership
        const { data: project, error: projectError } = await supabaseAdmin
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (projectError || !project) {
            return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
        }

        // 2. Upload to Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${projectId}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('media-assets') // Standardized bucket
            .upload(filePath, file, {
                contentType: file.type,
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return NextResponse.json({ error: uploadError.message }, { status: 500 });
        }

        // 3. Get Public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('media-assets')
            .getPublicUrl(filePath);

        // 4. Create record in media_assets
        const { data: asset, error: assetError } = await supabaseAdmin
            .from('media_assets')
            .insert({
                project_id: projectId,
                storage_url: publicUrl,
                storage_path: filePath,
                storage_bucket: 'media-assets',
                image_type: file.type,
                approved: true
            } as any)
            .select()
            .single();

        if (assetError) {
            console.error('Asset creation error:', assetError);
            // Optionally cleanup storage if DB insert fails
            return NextResponse.json({ error: assetError.message }, { status: 500 });
        }

        return NextResponse.json({ asset });
    } catch (error: any) {
        console.error('Media upload error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
