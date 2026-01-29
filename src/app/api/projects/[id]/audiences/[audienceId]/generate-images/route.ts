// Generate all images for an audience API

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { getQueueClient } from '@/lib/queue/client';
import { JOB_TYPES } from '@/lib/queue/jobs';
import { GenerateAudienceImagesRequest } from '@/types/api';
import { logAuditEvent } from '@/lib/audit/logger';
import { requireAuth } from '@/lib/auth/middleware';
import { createServiceRoleClient } from '@/lib/auth/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; audienceId: string } }
) {
  try {
    // Auth check
    const auth = await requireAuth(request);
    if (auth.response) return auth.response;

    const projectId = params.id;
    const audienceId = params.audienceId;
    const body = await request.json() as GenerateAudienceImagesRequest;

    // Validate audience belongs to project
    const supabaseService = createServiceRoleClient();
    const { data: audience, error: audienceError } = await supabaseService
      .from('audience_segments')
      .select('*')
      .eq('id', audienceId)
      .eq('project_id', projectId)
      .single();

    if (audienceError || !audience) {
      return NextResponse.json({ error: 'Audience not found' }, { status: 404 });
    }

    // Create generation record
    const { data: generation, error: genError } = await supabaseService
      .from('audience_image_generations')
      .insert({
        project_id: projectId,
        audience_id: audienceId,
        persona_name: audience.name, // Use audience name to look up persona
        status: 'pending',
        config: {
          product_ids: body.product_ids,
          campaign_id: body.campaign_id,
          image_types: body.image_types,
          variations_per_type: body.variations_per_type,
          platform: body.platform,
          funnel_stage: body.funnel_stage,
          angle: body.angle,
        },
        generated_images: [],
      })
      .select()
      .single();

    if (genError || !generation) {
      return NextResponse.json(
        { error: genError?.message || 'Failed to create generation record' },
        { status: 500 }
      );
    }

    // Queue image generation job
    try {
      const queue = await getQueueClient();
      const job = await queue.send(JOB_TYPES.GENERATE_AUDIENCE_IMAGES, {
        project_id: projectId,
        generation_id: generation.id,
        audience_id: audienceId,
        product_ids: body.product_ids,
        campaign_id: body.campaign_id,
        image_types: body.image_types,
        variations_per_type: body.variations_per_type,
        platform: body.platform,
        funnel_stage: body.funnel_stage,
        angle: body.angle,
      });

      console.log('✅ Image generation job queued:', job?.id || generation.id);
    } catch (queueError: any) {
      console.error('❌ Failed to queue image generation job:', queueError);
      // Update generation status to failed
      await supabaseService
        .from('audience_image_generations')
        .update({
          status: 'failed',
          error_message: `Failed to queue job: ${queueError.message}`,
          completed_at: new Date().toISOString(),
        })
        .eq('id', generation.id);

      return NextResponse.json(
        { 
          error: 'Failed to queue image generation job',
          details: queueError.message,
          note: 'Make sure the worker process is running (cd workers && npm run dev)'
        },
        { status: 500 }
      );
    }

    // Log audit event
    await logAuditEvent({
      event_type: 'audience_image_generation_triggered',
      actor_type: 'user',
      source: 'ui',
      project_id: projectId,
      payload: {
        generation_id: generation.id,
        audience_id: audienceId,
        product_ids: body.product_ids,
      },
    });

    return NextResponse.json({
      job_id: generation.id,
      status: 'processing',
      message: 'Image generation started',
    });
  } catch (error) {
    console.error('Generate images error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
