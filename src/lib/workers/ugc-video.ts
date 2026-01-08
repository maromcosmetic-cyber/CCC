// UGC Video generation worker job handler (8-step pipeline)

import { UGCVideoJobData } from '../queue/jobs';
import { KieAIProvider } from '../providers/kie/KieAIProvider';
import { VideoProvider } from '../providers/base/VideoProvider';
import { SupabaseStorage } from '../providers/supabase/SupabaseStorage';
import { supabaseAdmin } from '../db/client';
import { logAuditEvent } from '../audit/logger';
import { logCost } from '../costs/tracker';

export async function generateUGCVideoJob(data: UGCVideoJobData): Promise<void> {
  const {
    project_id,
    ugc_video_id,
    location_text,
    character_id,
    voice_id,
    script_text,
    product_id,
    generation_config,
  } = data;

  try {
    // Update video status
    await supabaseAdmin
      ?.from('ugc_videos')
      .update({ status: 'processing' })
      .eq('id', ugc_video_id);

    // All AI services use Kie AI unified gateway
    const kieAI = new KieAIProvider();
    const imageProvider = kieAI; // Kie AI handles all image generation (DALL-E, Flux, etc.)
    const videoProvider = {} as VideoProvider; // TODO: Implement Sora provider
    const ttsProvider = kieAI; // Kie AI handles TTS
    const lipSyncProvider = kieAI; // Kie AI handles lip-sync
    const bgRemovalProvider = kieAI; // Kie AI handles background removal
    const storage = new SupabaseStorage();

    // Step 1: Generate background image
    await updateVideoJobStep(ugc_video_id, 'background_gen', 'running');
    // TODO: Replace stub with actual API call
    const backgroundResult = await imageProvider.generateBackground(location_text);
    await updateVideoJobStep(ugc_video_id, 'background_gen', 'completed', {
      image_url: backgroundResult.url,
    });

    // Step 2: Remove product image background
    await updateVideoJobStep(ugc_video_id, 'character_video', 'running');
    const { data: product } = await supabaseAdmin
      ?.from('products')
      .select('images')
      .eq('id', product_id)
      .single();

    const productImageUrl = (product?.images as any)?.[0]?.url;
    if (!productImageUrl) {
      throw new Error('Product image not found');
    }

    // TODO: Replace stub with actual API call
    const productNoBg = await bgRemovalProvider.removeBackground(productImageUrl);
    await updateVideoJobStep(ugc_video_id, 'character_video', 'completed', {
      product_image_url: productNoBg.url,
    });

    // Step 3: Generate character video
    await updateVideoJobStep(ugc_video_id, 'character_video', 'running');
    const { data: character } = await supabaseAdmin
      ?.from('characters')
      .select('*')
      .eq('id', character_id || '')
      .single();

    if (!character) {
      throw new Error('Character not found');
    }

    // TODO: Replace stub with actual Sora API call
    // const characterVideo = await videoProvider.generateCharacterVideo(character, script_text);
    const characterVideo = { url: 'https://example.com/mock-character-video.mp4' }; // Mock
    await updateVideoJobStep(ugc_video_id, 'character_video', 'completed', {
      video_url: characterVideo.url,
    });

    // Step 4: Generate TTS audio
    await updateVideoJobStep(ugc_video_id, 'tts', 'running');
    // TODO: Replace stub with actual API call
    const audioResult = await ttsProvider.generateSpeech(script_text, { voice_id });
    await updateVideoJobStep(ugc_video_id, 'tts', 'completed', {
      audio_url: audioResult.url,
    });

    // Step 5: Apply lip-sync
    await updateVideoJobStep(ugc_video_id, 'lip_sync', 'running');
    // TODO: Replace stub with actual API call
    const syncedVideo = await lipSyncProvider.syncLips(
      characterVideo.url,
      audioResult.url,
      { quality: 'high' }
    );
    await updateVideoJobStep(ugc_video_id, 'lip_sync', 'completed', {
      synced_video_url: syncedVideo.url,
    });

    // Step 6: Composite (background + product + character video)
    await updateVideoJobStep(ugc_video_id, 'composite', 'running');
    // TODO: Implement video compositing (use ffmpeg or video processing service)
    // For now, mock the composite step
    const compositeVideoUrl = syncedVideo.url; // In real implementation, composite all layers
    await updateVideoJobStep(ugc_video_id, 'composite', 'completed', {
      composite_video_url: compositeVideoUrl,
    });

    // Step 7: Upload final video to Supabase Storage
    await updateVideoJobStep(ugc_video_id, 'upload', 'running');
    // TODO: Download composite video and upload to storage
    const finalStoragePath = `${project_id}/ugc-videos/${ugc_video_id}.mp4`;
    // Mock upload
    const mockVideoBuffer = Buffer.from('mock-video-data');
    const uploadResult = await storage.uploadFile(
      mockVideoBuffer,
      'ugc-videos',
      finalStoragePath,
      { contentType: 'video/mp4' }
    );

    // Get signed URL
    const signedUrl = await storage.createSignedUrl('ugc-videos', finalStoragePath, 86400);

    // Step 8: Update ugc_videos record
    await supabaseAdmin
      ?.from('ugc_videos')
      .update({
        status: 'completed',
        storage_path: finalStoragePath,
        storage_url: signedUrl,
        video_duration_seconds: audioResult.duration_seconds,
        completed_at: new Date().toISOString(),
      })
      .eq('id', ugc_video_id);

    await updateVideoJobStep(ugc_video_id, 'upload', 'completed', {
      storage_path: finalStoragePath,
      storage_url: signedUrl,
    });

    // Log audit event
    await logAuditEvent({
      event_type: 'ugc_video_completed',
      actor_type: 'worker',
      source: 'worker',
      project_id,
      payload: {
        ugc_video_id,
        duration_seconds: audioResult.duration_seconds,
      },
    });

    // Log costs (mock)
    await logCost({
      project_id,
      provider_type: 'image',
      cost_amount: 0.04, // Background image
      cost_currency: 'USD',
    });
    await logCost({
      project_id,
      provider_type: 'rembg',
      cost_amount: 0.02, // Background removal
      cost_currency: 'USD',
    });
    await logCost({
      project_id,
      provider_type: 'video',
      cost_amount: 0.50, // Character video (Sora)
      cost_currency: 'USD',
    });
    await logCost({
      project_id,
      provider_type: 'elevenlabs',
      cost_amount: 0.30 * (script_text.length / 1000), // TTS
      cost_currency: 'USD',
    });
    await logCost({
      project_id,
      provider_type: 'synclabs',
      cost_amount: 0.10, // Lip-sync
      cost_currency: 'USD',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await supabaseAdmin
      ?.from('ugc_videos')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', ugc_video_id);

    await logAuditEvent({
      event_type: 'ugc_video_failed',
      actor_type: 'worker',
      source: 'worker',
      project_id,
      payload: {
        ugc_video_id,
        error: errorMessage,
      },
    });

    throw error;
  }
}

async function updateVideoJobStep(
  ugc_video_id: string,
  step: string,
  status: 'pending' | 'running' | 'completed' | 'failed',
  output_data?: Record<string, any>
): Promise<void> {
  if (!supabaseAdmin) return;

  // Find existing job or create new
  const { data: existing } = await supabaseAdmin
    .from('video_generation_jobs')
    .select('id')
    .eq('ugc_video_id', ugc_video_id)
    .eq('step', step)
    .single();

  const updateData: any = {
    status,
    output_data: output_data || {},
  };

  if (status === 'running') {
    updateData.started_at = new Date().toISOString();
  }

  if (status === 'completed' || status === 'failed') {
    updateData.completed_at = new Date().toISOString();
  }

  if (existing) {
    await supabaseAdmin
      .from('video_generation_jobs')
      .update(updateData)
      .eq('id', existing.id);
  } else {
    await supabaseAdmin
      .from('video_generation_jobs')
      .insert({
        ugc_video_id,
        step,
        status,
        input_data: {},
        output_data: output_data || {},
        started_at: status === 'running' ? new Date().toISOString() : null,
        completed_at: (status === 'completed' || status === 'failed') ? new Date().toISOString() : null,
      });
  }
}

