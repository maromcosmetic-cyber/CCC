// Generate AI-enhanced audience API

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { getQueueClient, JOB_TYPES } from '@/lib/queue/jobs';
import { GenerateAudienceSchema } from '@/lib/validation/schemas';
import { logAuditEvent } from '@/lib/audit/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const body = await request.json();
    const validated = GenerateAudienceSchema.parse(body);

    // Queue audience generation job
    const queue = await getQueueClient();
    await queue.send(JOB_TYPES.GENERATE_AUDIENCE, {
      project_id: projectId,
      user_prompt: validated.user_prompt,
      company_profile_version_id: validated.company_profile_version_id,
    });

    // Create job run record
    const { data: jobRun } = await supabase.from('job_runs').insert({
      project_id: projectId,
      job_type: JOB_TYPES.GENERATE_AUDIENCE,
      job_data: {
        user_prompt: validated.user_prompt,
        company_profile_version_id: validated.company_profile_version_id,
      },
      status: 'pending',
    } as any).select().single();

    await logAuditEvent({
      event_type: 'audience_generation_triggered',
      actor_type: 'user',
      source: 'ui',
      project_id: projectId,
      payload: { user_prompt: validated.user_prompt },
    });

    return NextResponse.json({
      audience_segment_id: null, // Will be set when job completes
      status: 'processing',
      job_id: (jobRun as any)?.id,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


