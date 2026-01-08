// Export project data as JSON

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    // Fetch all project data
    const [project, scrapeRuns, companyProfiles, products, campaigns, audiences, strategies, calendars] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('scrape_runs').select('*').eq('project_id', projectId),
      supabase.from('company_profiles').select('*').eq('project_id', projectId),
      supabase.from('products').select('*').eq('project_id', projectId),
      supabase.from('campaigns').select('*').eq('project_id', projectId),
      supabase.from('audience_segments').select('*').eq('project_id', projectId),
      supabase.from('strategies').select('*').eq('project_id', projectId),
      supabase.from('calendar_versions').select('*, calendar_posts(*)').eq('project_id', projectId),
    ]);

    const exportData = {
      project: project.data,
      scrape_runs: scrapeRuns.data,
      company_profiles: companyProfiles.data,
      products: products.data,
      campaigns: campaigns.data,
      audiences: audiences.data,
      strategies: strategies.data,
      calendars: calendars.data,
      exported_at: new Date().toISOString(),
    };

    return NextResponse.json(exportData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="project-${projectId}-export.json"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


