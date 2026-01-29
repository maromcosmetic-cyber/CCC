// Audience Image Generation worker job handler

import { AudienceImageGenerationJobData } from '../queue/jobs';
import { generateAudienceImages } from '../product-image/pipeline';
import { supabaseAdmin } from '../db/client';
import { logAuditEvent } from '../audit/logger';
import { logCost } from '../costs/tracker';

export async function generateAudienceImagesJob(data: AudienceImageGenerationJobData): Promise<void> {
  const {
    project_id,
    generation_id,
    audience_id,
    product_ids,
    campaign_id,
    image_types,
    variations_per_type,
    platform,
    funnel_stage,
    angle,
  } = data;

  try {
    // Update generation status
    await supabaseAdmin
      ?.from('audience_image_generations')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', generation_id);

    // Progress callback to update database
    const updateProgress = async (step: string, progress: { current: number; total: number; details?: string }) => {
      try {
        await supabaseAdmin
          ?.from('audience_image_generations')
          .update({
            config: {
              product_ids,
              campaign_id,
              image_types,
              variations_per_type,
              platform,
              funnel_stage,
              angle,
              progress: {
                step,
                current: progress.current,
                total: progress.total,
                details: progress.details,
              },
            },
          })
          .eq('id', generation_id);
      } catch (error) {
        console.error('Failed to update progress:', error);
      }
    };

    // Generate images with progress tracking
    const result = await generateAudienceImages(
      project_id,
      audience_id,
      {
        product_ids,
        campaign_id,
        image_types,
        variations_per_type,
        platform,
        funnel_stage,
        angle,
      },
      updateProgress
    );

    // Update generation with results
    const finalStatus = result.errors.length > 0 && result.generated_images.length === 0 ? 'failed' : 'completed';
    await supabaseAdmin
      ?.from('audience_image_generations')
      .update({
        status: finalStatus,
        generated_images: result.generated_images,
        error_message: result.errors.length > 0 ? result.errors.join('; ') : null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', generation_id);

    console.log(`✅ Image generation ${finalStatus}:`, {
      generation_id,
      images_count: result.generated_images.length,
      errors_count: result.errors.length,
    });

    // Log audit event
    await logAuditEvent({
      event_type: 'audience_images_generated',
      actor_type: 'worker',
      source: 'worker',
      project_id,
      payload: {
        generation_id,
        audience_id,
        images_count: result.generated_images.length,
        errors_count: result.errors.length,
      },
    });

    // Log cost (estimate: $0.04 per image generation + $0.02 per upscale)
    const estimatedCost = result.generated_images.length * (0.04 + 0.02);
    await logCost({
      project_id,
      provider_type: 'image_generation',
      cost_amount: estimatedCost,
      cost_currency: 'USD',
      metadata: {
        generation_id,
        images_count: result.generated_images.length,
        provider: 'vertex-imagen-freepik',
      },
    });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update generation status to failed
    await supabaseAdmin
      ?.from('audience_image_generations')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', generation_id);

    await logAuditEvent({
      event_type: 'audience_image_generation_failed',
      actor_type: 'worker',
      source: 'worker',
      project_id,
      payload: {
        generation_id,
        audience_id,
        error: errorMessage,
      },
    });

    throw error;
  }
}
