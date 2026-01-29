// Generate assets for post API

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { getQueueClient, JOB_TYPES } from '@/lib/queue/jobs';
import { GenerateAssetsRequest } from '@/types/api';
import { logAuditEvent } from '@/lib/audit/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const { postId } = params;
    const body = await request.json() as GenerateAssetsRequest;

    // Get post to find project_id
    const { data: post } = await supabase
      .from('calendar_posts')
      .select('*, calendar_versions!inner(project_id)')
      .eq('id', postId)
      .single();

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const projectId = ((post as any).calendar_versions as any).project_id;

    // Queue asset generation job
    const queue = await getQueueClient();
    await queue.send(JOB_TYPES.GENERATE_ASSETS, {
      project_id: projectId,
      post_id: postId,
      asset_types: body.asset_types || ['image'],
    });

    // Create job run record
    const { data: jobRun } = await supabase.from('job_runs').insert({
      project_id: projectId,
      job_type: JOB_TYPES.GENERATE_ASSETS,
      job_data: { post_id: postId, asset_types: body.asset_types },
      status: 'pending',
    } as any).select().single();

    await logAuditEvent({
      event_type: 'asset_generation_triggered',
      actor_type: 'user',
      source: 'ui',
      project_id: projectId,
      payload: { post_id: postId },
    });

    return NextResponse.json({
      job_id: (jobRun as any)?.id,
      status: 'processing',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


