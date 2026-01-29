// Generate calendar API

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { getQueueClient, JOB_TYPES } from '@/lib/queue/jobs';
import { GenerateCalendarSchema } from '@/lib/validation/schemas';
import { logAuditEvent } from '@/lib/audit/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const body = await request.json();
    const validated = GenerateCalendarSchema.parse(body);

    // Verify strategy exists
    const { data: strategy } = await supabase
      .from('strategies')
      .select('*')
      .eq('id', validated.strategy_version_id)
      .eq('project_id', projectId)
      .single();

    if (!strategy) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
    }

    // Queue calendar generation job
    const queue = await getQueueClient();
    await queue.send(JOB_TYPES.GENERATE_CALENDAR, {
      project_id: projectId,
      strategy_version_id: validated.strategy_version_id,
      weeks: validated.weeks || 4,
    });

    // Create job run record
    const { data: jobRun } = await supabase.from('job_runs').insert({
      project_id: projectId,
      job_type: JOB_TYPES.GENERATE_CALENDAR,
      job_data: {
        strategy_version_id: validated.strategy_version_id,
        weeks: validated.weeks || 4,
      },
      status: 'pending',
    } as any).select().single();

    await logAuditEvent({
      event_type: 'calendar_generation_triggered',
      actor_type: 'user',
      source: 'ui',
      project_id: projectId,
      payload: { strategy_version_id: validated.strategy_version_id },
    });

    return NextResponse.json({
      calendar_version_id: null, // Will be set when job completes
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


