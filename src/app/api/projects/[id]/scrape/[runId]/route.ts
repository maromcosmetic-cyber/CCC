// Get scrape status API

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; runId: string } }
) {
  try {
    const { runId } = params;

    const { data: scrapeRun, error: runError } = await supabase
      .from('scrape_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (runError || !scrapeRun) {
      return NextResponse.json({ error: 'Scrape run not found' }, { status: 404 });
    }

    const { data: pages, error: pagesError } = await supabase
      .from('scrape_pages')
      .select('id, url, title, page_type')
      .eq('scrape_run_id', runId)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      scrape_run: {
        id: scrapeRun.id,
        status: scrapeRun.status,
        pages: pages || [],
        started_at: scrapeRun.started_at,
        completed_at: scrapeRun.completed_at,
        error_message: scrapeRun.error_message,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


