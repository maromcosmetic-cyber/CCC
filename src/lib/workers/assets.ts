// Asset generation worker job handler

import { AssetsJobData } from '../queue/jobs';
import { KieAIProvider } from '../providers/kie/KieAIProvider';
import { SupabaseStorage } from '../providers/supabase/SupabaseStorage';
import { supabaseAdmin } from '../db/client';
import { logAuditEvent } from '../audit/logger';
import { logCost } from '../costs/tracker';

export async function generateAssetsJob(data: AssetsJobData): Promise<void> {
  const { project_id, post_id, asset_types = ['image'] } = data;

  try {
    // Get calendar post
    const { data: post } = await supabaseAdmin
      ?.from('calendar_posts')
      .select('*, calendar_versions!inner(project_id)')
      .eq('id', post_id)
      .single();

    if (!post) {
      throw new Error('Calendar post not found');
    }

    const postData = post.post_data as any;
    const brief = postData.brief || 'Create engaging visual content';

    // Image generation is platform-managed - uses Kie AI unified gateway
    const imageProvider = new KieAIProvider();
    const storage = new SupabaseStorage();

    const generatedAssets = [];

    // Generate images if requested
    if (asset_types.includes('image')) {
      // TODO: Replace stub with actual image generation API call
      const imageResult = await imageProvider.generateImage(brief);

      // Download and upload to Supabase Storage
      // In real implementation, download from imageResult.url first
      const storagePath = `${project_id}/generated-assets/${Date.now()}-image.png`;
      
      // Mock: create a placeholder buffer
      const mockImageBuffer = Buffer.from('mock-image-data');
      const uploadResult = await storage.uploadFile(
        mockImageBuffer,
        'generated-assets',
        storagePath,
        { contentType: 'image/png' }
      );

      // Create media asset record
      const { data: mediaAsset } = await supabaseAdmin
        ?.from('media_assets')
        .insert({
          project_id,
          storage_path: uploadResult.path,
          storage_bucket: 'generated-assets',
          file_type: 'image',
          mime_type: 'image/png',
          storage_url: uploadResult.url,
          is_public: false,
          prompt_lineage: {
            prompt: brief,
            provider: 'openai-dalle3',
            post_id,
          },
          approved: false,
        })
        .select()
        .single();

      if (mediaAsset) {
        generatedAssets.push(mediaAsset);
      }
    }

    // Update post with asset references
    await supabaseAdmin
      ?.from('calendar_posts')
      .update({
        post_data: {
          ...postData,
          assets: generatedAssets.map((a) => a.id),
        },
      })
      .eq('id', post_id);

    // Log audit event
    await logAuditEvent({
      event_type: 'assets_generated',
      actor_type: 'worker',
      source: 'worker',
      project_id,
      payload: {
        post_id,
        assets_count: generatedAssets.length,
      },
    });

    // Log cost (mock)
    await logCost({
      project_id,
      provider_type: 'image',
      cost_amount: 0.04 * generatedAssets.length, // Mock: $0.04 per image
      cost_currency: 'USD',
      metadata: { assets_count: generatedAssets.length },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await logAuditEvent({
      event_type: 'asset_generation_failed',
      actor_type: 'worker',
      source: 'worker',
      project_id,
      payload: {
        post_id,
        error: errorMessage,
      },
    });

    throw error;
  }
}

