// Create UGC video API

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { getQueueClient, JOB_TYPES } from '@/lib/queue/jobs';
import { CreateUGCVideoSchema } from '@/lib/validation/schemas';
import { logAuditEvent } from '@/lib/audit/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateUGCVideoSchema.parse(body);

    // Get project_id from product
    const { data: product } = await supabase
      .from('products')
      .select('project_id')
      .eq('id', validated.product_id)
      .single();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const projectId = (product as any).project_id;

    // Create UGC video record
    const { data: ugcVideo, error } = await supabase
      .from('ugc_videos')
      // @ts-ignore
      .insert({
        project_id: projectId,
        product_id: validated.product_id,
        character_id: validated.character_id,
        location_text: validated.location_text,
        voice_id: validated.voice_id,
        script_text: validated.script_text,
        status: 'pending',
        generation_config: validated.generation_config || {},
      } as any)
      .select()
      .single();

    if (error || !ugcVideo) {
      return NextResponse.json({ error: error?.message || 'Failed to create UGC video' }, { status: 500 });
    }

    // Queue UGC video generation job
    const queue = await getQueueClient();
    await queue.send(JOB_TYPES.GENERATE_UGC_VIDEO, {
      project_id: projectId,
      ugc_video_id: (ugcVideo as any).id,
      location_text: validated.location_text,
      character_id: validated.character_id,
      voice_id: validated.voice_id,
      script_text: validated.script_text,
      product_id: validated.product_id,
      generation_config: validated.generation_config,
    });

    // Create job run record
    // @ts-ignore
    await supabase.from('job_runs').insert({
      project_id: projectId,
      job_type: JOB_TYPES.GENERATE_UGC_VIDEO,
      job_data: { ugc_video_id: (ugcVideo as any).id },
      status: 'pending',
    } as any);

    await logAuditEvent({
      event_type: 'ugc_video_created',
      actor_type: 'user',
      source: 'ui',
      project_id: projectId,
      payload: { ugc_video_id: (ugcVideo as any).id },
    });

    return NextResponse.json({
      ugc_video_id: (ugcVideo as any).id,
      status: 'processing',
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


