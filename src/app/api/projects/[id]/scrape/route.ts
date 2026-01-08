// Trigger scrape API

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { getQueueClient, JOB_TYPES } from '@/lib/queue/jobs';
import { ScrapeConfigSchema } from '@/lib/validation/schemas';
import { logAuditEvent } from '@/lib/audit/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const body = await request.json();
    const config = ScrapeConfigSchema.parse(body.config || {});

    // Get project
    const { data: project } = await supabase
      .from('projects')
      .select('website_url')
      .eq('id', projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Create scrape run
    const { data: scrapeRun, error } = await supabase
      .from('scrape_runs')
      .insert({
        project_id: projectId,
        version: 1,
        status: 'pending',
        config,
      })
      .select()
      .single();

    if (error || !scrapeRun) {
      return NextResponse.json({ error: error?.message || 'Failed to create scrape run' }, { status: 500 });
    }

    // Queue scrape job
    const queue = await getQueueClient();
    await queue.send(JOB_TYPES.RUN_SCRAPE, {
      project_id: projectId,
      scrape_run_id: scrapeRun.id,
      website_url: project.website_url,
      config,
    });

    // Create job run record
    await supabase.from('job_runs').insert({
      project_id: projectId,
      job_type: JOB_TYPES.RUN_SCRAPE,
      job_data: { scrape_run_id: scrapeRun.id },
      status: 'pending',
    });

    await logAuditEvent({
      event_type: 'scrape_triggered',
      actor_type: 'user',
      source: 'ui',
      project_id: projectId,
      payload: { scrape_run_id: scrapeRun.id },
    });

    return NextResponse.json({
      scrape_run_id: scrapeRun.id,
      status: 'pending',
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


