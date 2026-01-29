// Projects API routes

import { NextRequest, NextResponse } from 'next/server';
import { CreateProjectSchema } from '@/lib/validation/schemas';
import { logAuditEvent } from '@/lib/audit/logger';
import { getQueueClient } from '@/lib/queue/client';
import { JOB_TYPES } from '@/lib/queue/jobs';
import { requireAuth } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  try {
    // Require authentication - returns authenticated supabase client
    const auth = await requireAuth(request);
    if (auth.response) {
      return auth.response;
    }

    const user = auth.user!;
    const supabase = auth.supabase!;
    const body = await request.json();
    const validated = CreateProjectSchema.parse(body);

    // Normalize website URL
    let websiteUrl = validated.website_url.trim();
    if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
      websiteUrl = `https://${websiteUrl}`;
    }

    // Validate URL
    try {
      new URL(websiteUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Prevent localhost/private IPs
    const url = new URL(websiteUrl);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname.startsWith('192.168.')) {
      return NextResponse.json({ error: 'Localhost and private IPs are not allowed' }, { status: 400 });
    }

    // Use authenticated user's ID
    const userId = user.id;

    // Create project using authenticated supabase client
    const { data: project, error } = await supabase
      .from('projects')
      // @ts-ignore
      .insert({
        user_id: userId,
        name: validated.name,
        website_url: websiteUrl,
        monthly_budget_amount: validated.monthly_budget_amount,
        monthly_budget_currency: validated.monthly_budget_currency || 'USD',
        target_regions: validated.target_regions || [],
        languages: validated.languages || [],
        primary_channels: validated.primary_channels || [],
        industry: validated.industry,
      })
      .select()
      .single();

    if (error || !project) {
      return NextResponse.json({ error: error?.message || 'Failed to create project' }, { status: 500 });
    }

    // Create initial scrape run
    const { data: scrapeRun } = await supabase
      .from('scrape_runs')
      // @ts-ignore
      .insert({
        project_id: (project as any).id,
        version: 1,
        status: 'pending',
        config: { max_pages: 20, include_legal: true },
      } as any)
      .select()
      .single();

    // Queue scrape job
    if (scrapeRun) {
      const queue = await getQueueClient();
      await queue.send(JOB_TYPES.RUN_SCRAPE, {
        project_id: (project as any).id,
        scrape_run_id: (scrapeRun as any).id,
        website_url: websiteUrl,
        config: { max_pages: 20, include_legal: true },
      });

      // Create job run record
      // @ts-ignore
      await supabase.from('job_runs').insert({
        project_id: (project as any).id,
        job_type: JOB_TYPES.RUN_SCRAPE,
        job_data: { scrape_run_id: (scrapeRun as any).id },
        status: 'pending',
      } as any);
    }

    // Log audit event
    await logAuditEvent({
      event_type: 'project_created',
      actor_id: userId,
      actor_type: 'user',
      source: 'ui',
      project_id: (project as any).id,
      payload: { name: (project as any).name, website_url: websiteUrl },
    });

    return NextResponse.json({
      project: {
        id: (project as any).id,
        name: (project as any).name,
        website_url: (project as any).website_url,
        status: 'created',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Require authentication - returns authenticated supabase client
    const auth = await requireAuth(request);
    if (auth.response) {
      return auth.response;
    }

    const supabase = auth.supabase!;

    // RLS will automatically filter to user's projects
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ projects: projects || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
