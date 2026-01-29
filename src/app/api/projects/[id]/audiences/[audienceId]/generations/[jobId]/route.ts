// Get generation job status API

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { createServiceRoleClient } from '@/lib/auth/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; audienceId: string; jobId: string } }
) {
  try {
    // Auth check
    const auth = await requireAuth(request);
    if (auth.response) return auth.response;

    const projectId = params.id;
    const audienceId = params.audienceId;
    const jobId = params.jobId;

    // Get generation record
    const supabaseService = createServiceRoleClient();
    const { data: generation, error } = await supabaseService
      .from('audience_image_generations')
      .select('*')
      .eq('id', jobId)
      .eq('project_id', projectId)
      .eq('audience_id', audienceId)
      .single();

    if (error || !generation) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    const generatedImages = (generation.generated_images as any[]) || [];
    const totalImages = generatedImages.length;
    const config = generation.config as any;
    const progress = config?.progress;

    // Fetch full image data including storage_path and storage_bucket from media_assets
    const imageIds = generatedImages.map((img: any) => img.id).filter(Boolean);
    let mediaAssetsMap: Record<string, any> = {};
    
    if (imageIds.length > 0) {
      const { data: mediaAssets } = await supabaseService
        .from('media_assets')
        .select('id, storage_path, storage_bucket, storage_url')
        .in('id', imageIds)
        .eq('project_id', projectId);
      
      if (mediaAssets) {
        mediaAssetsMap = mediaAssets.reduce((acc: Record<string, any>, asset: any) => {
          acc[asset.id] = asset;
          return acc;
        }, {});
      }
    }

    return NextResponse.json({
      generation: {
        id: generation.id,
        status: generation.status,
        progress: generation.status === 'processing'
          ? {
              current: progress?.current || totalImages,
              total: progress?.total || 15,
              current_step: progress?.step || 'Generating images...',
              details: progress?.details,
            }
          : undefined,
        generated_images: generatedImages.map((img: any) => {
          const mediaAsset = mediaAssetsMap[img.id];
          return {
            id: img.id,
            image_type: img.image_type,
            storage_url: img.storage_url,
            storage_path: mediaAsset?.storage_path || img.storage_path,
            storage_bucket: mediaAsset?.storage_bucket || img.storage_bucket,
            product_ids: img.product_ids,
            created_at: img.created_at,
          };
        }),
        error_message: generation.error_message,
        created_at: generation.created_at,
        started_at: generation.started_at,
        completed_at: generation.completed_at,
      },
    });
  } catch (error: any) {
    console.error('Get generation status error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
