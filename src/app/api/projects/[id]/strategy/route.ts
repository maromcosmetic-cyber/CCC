// Generate strategy API

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { getQueueClient, JOB_TYPES } from '@/lib/queue/jobs';
import { GenerateStrategySchema } from '@/lib/validation/schemas';
import { logAuditEvent } from '@/lib/audit/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const body = await request.json();
    const validated = GenerateStrategySchema.parse(body);

    // Verify company profile is locked
    let companyProfile;
    if (validated.company_profile_version_id) {
      const { data } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('id', validated.company_profile_version_id)
        .eq('project_id', projectId)
        .single();
      companyProfile = data as any;
    } else {
      const { data } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('project_id', projectId)
        .not('locked_at', 'is', null)
        .order('version', { ascending: false })
        .limit(1)
        .single();
      companyProfile = data as any;
    }

    if (!companyProfile || !companyProfile.locked_at) {
      return NextResponse.json(
        { error: 'No locked company profile found. Please lock a company profile first.' },
        { status: 400 }
      );
    }

    // Queue strategy generation job
    const queue = await getQueueClient();
    await queue.send(JOB_TYPES.GENERATE_STRATEGY, {
      project_id: projectId,
      company_profile_version_id: companyProfile.id,
      target_version: validated.company_profile_version_id ? undefined : undefined,
    });

    // Create job run record
    const { data: jobRun } = await supabase.from('job_runs').insert({
      project_id: projectId,
      job_type: JOB_TYPES.GENERATE_STRATEGY,
      job_data: { company_profile_version_id: (companyProfile as any).id },
      status: 'pending',
    } as any).select().single();

    await logAuditEvent({
      event_type: 'strategy_generation_triggered',
      actor_type: 'user',
      source: 'ui',
      project_id: projectId,
      payload: { company_profile_version_id: (companyProfile as any).id },
    });

    // Poll for completion (in real implementation, use webhooks or polling)
    // For now, return immediately
    return NextResponse.json({
      strategy_version_id: null, // Will be set when job completes
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


