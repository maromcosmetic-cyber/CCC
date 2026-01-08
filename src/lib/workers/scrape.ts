// Scrape worker job handler

import { ScrapeJobData } from '../queue/jobs';
import { FirecrawlScraper } from '../providers/firecrawl/FirecrawlScraper';
import { SupabaseStorage } from '../providers/supabase/SupabaseStorage';
import { supabaseAdmin } from '../db/client';
import { logAuditEvent } from '../audit/logger';
import { logCost } from '../costs/tracker';

export async function runScrapeJob(data: ScrapeJobData): Promise<void> {
  const { project_id, scrape_run_id, website_url, config } = data;

  try {
    // Update job status
    await updateJobStatus(scrape_run_id, 'running', []);

    // Firecrawl is platform-managed - uses env vars directly
    const scraper = new FirecrawlScraper();
    const storage = new SupabaseStorage();

    // TODO: Replace stub with actual Firecrawl API call
    const results = await scraper.scrape(website_url, config);

    // Store each page
    const pages = [];
    for (const result of results) {
      // Store HTML content in Supabase Storage
      const storagePath = `${project_id}/scraped/${Date.now()}-${result.url.split('/').pop() || 'page'}.html`;
      const htmlBuffer = Buffer.from(result.html_content || result.content, 'utf-8');
      
      await storage.uploadFile(
        htmlBuffer,
        'scraped-content',
        storagePath,
        { contentType: 'text/html' }
      );

      // Insert page record
      const { data: page, error } = await supabaseAdmin
        ?.from('scrape_pages')
        .insert({
          scrape_run_id,
          url: result.url,
          title: result.title,
          content: result.content,
          html_content: result.html_content,
          page_type: result.page_type,
          evidence_snippets: [],
          storage_path: storagePath,
        })
        .select()
        .single();

      if (page) {
        pages.push(page);
      }

      if (error) {
        console.error('Failed to insert scrape page:', error);
      }
    }

    // Update scrape run status
    await supabaseAdmin
      ?.from('scrape_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', scrape_run_id);

    // Log audit event
    await logAuditEvent({
      event_type: 'scrape_completed',
      actor_type: 'worker',
      source: 'worker',
      project_id,
      payload: {
        scrape_run_id,
        pages_count: pages.length,
      },
    });

    // Log cost (mock for now)
    await logCost({
      project_id,
      provider_type: 'firecrawl',
      cost_amount: 0.01 * pages.length, // Mock cost
      cost_currency: 'USD',
      metadata: { pages_count: pages.length },
    });

    await updateJobStatus(scrape_run_id, 'completed', [
      `Scraped ${pages.length} pages successfully`,
    ]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await supabaseAdmin
      ?.from('scrape_runs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', scrape_run_id);

    await logAuditEvent({
      event_type: 'scrape_failed',
      actor_type: 'worker',
      source: 'worker',
      project_id,
      payload: {
        scrape_run_id,
        error: errorMessage,
      },
    });

    await updateJobStatus(scrape_run_id, 'failed', [errorMessage]);
    throw error;
  }
}

async function updateJobStatus(
  jobId: string,
  status: 'pending' | 'running' | 'completed' | 'failed',
  logs: string[]
): Promise<void> {
  if (!supabaseAdmin) return;

  const updateData: any = {
    status,
    logs: logs,
  };

  if (status === 'running' && !logs.length) {
    updateData.started_at = new Date().toISOString();
  }

  if (status === 'completed' || status === 'failed') {
    updateData.completed_at = new Date().toISOString();
  }

  await supabaseAdmin
    .from('job_runs')
    .update(updateData)
    .eq('id', jobId);
}

