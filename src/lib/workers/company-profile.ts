// Company Profile worker job handler

import { CompanyProfileJobData } from '../queue/jobs';
import { KieAIProvider } from '../providers/kie/KieAIProvider';
import { SupabaseStorage } from '../providers/supabase/SupabaseStorage';
import { supabaseAdmin } from '../db/client';
import { logAuditEvent } from '../audit/logger';
import { logCost } from '../costs/tracker';
import { getTemplate } from '../prompts/templates';
import { renderTemplate } from '../prompts/render';

export async function buildCompanyProfileJob(data: CompanyProfileJobData): Promise<void> {
  const { project_id, scrape_run_id, target_version } = data;

  try {
    // Get scrape run and pages
    const { data: scrapeRun } = await supabaseAdmin
      ?.from('scrape_runs')
      .select('*')
      .eq('id', scrape_run_id)
      .single();

    if (!scrapeRun) {
      throw new Error('Scrape run not found');
    }

    const { data: pages } = await supabaseAdmin
      ?.from('scrape_pages')
      .select('*')
      .eq('scrape_run_id', scrape_run_id);

    if (!pages || pages.length === 0) {
      throw new Error('No scrape pages found');
    }

    // Combine scraped content
    const scrapedContent = pages
      .map((p) => `URL: ${p.url}\nTitle: ${p.title || 'N/A'}\nContent: ${p.content || ''}`)
      .join('\n\n---\n\n');

    // Get prompt template
    const template = getTemplate('COMPANY_PROFILE_FROM_SCRAPE');
    if (!template) {
      throw new Error('Company profile template not found');
    }

    // Render prompt
    const prompt = renderTemplate(template, {
      scraped_content: scrapedContent,
      website_url: scrapeRun.config?.website_url || '',
    });

    // LLM is platform-managed - uses Kie AI unified gateway
    const llm = new KieAIProvider();
    const response = await llm.generate(prompt, {
      json_schema: template.json_schema,
    });

    if (!response.structured) {
      throw new Error('Failed to generate structured company profile');
    }

    // Extract evidence references from pages
    const evidenceRefs = pages
      .filter((p) => p.evidence_snippets && p.evidence_snippets.length > 0)
      .flatMap((p) =>
        (p.evidence_snippets as any[]).map((snippet) => ({
          source_url: p.url,
          snippet: snippet.text || snippet,
          page_id: p.id,
        }))
      );

    // Store raw artifacts in Supabase Storage
    const storage = new SupabaseStorage();
    const storagePath = `${project_id}/company-profile/v${target_version || 1}.json`;
    const artifactsBuffer = Buffer.from(JSON.stringify(response.structured, null, 2), 'utf-8');

    await storage.uploadFile(
      artifactsBuffer,
      'company-profile-artifacts',
      storagePath,
      { contentType: 'application/json' }
    );

    // Get next version number
    const { data: existingProfiles } = await supabaseAdmin
      ?.from('company_profiles')
      .select('version')
      .eq('project_id', project_id)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = existingProfiles && existingProfiles.length > 0
      ? existingProfiles[0].version + 1
      : 1;

    // Create company profile
    const { data: profile, error } = await supabaseAdmin
      ?.from('company_profiles')
      .insert({
        project_id,
        version: nextVersion,
        profile_data: response.structured,
        evidence_refs: evidenceRefs,
        storage_path: storagePath,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create company profile: ${error.message}`);
    }

    // Log audit event
    await logAuditEvent({
      event_type: 'company_profile_created',
      actor_type: 'worker',
      source: 'worker',
      project_id,
      payload: {
        company_profile_id: profile.id,
        version: nextVersion,
      },
    });

    // Log cost
    const cost = llm.estimateCost(response.tokens_used?.total || 0);
    await logCost({
      project_id,
      provider_type: 'llm',
      cost_amount: cost,
      cost_currency: 'USD',
      metadata: {
        tokens: response.tokens_used?.total || 0,
        model: response.model,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await logAuditEvent({
      event_type: 'company_profile_failed',
      actor_type: 'worker',
      source: 'worker',
      project_id,
      payload: {
        scrape_run_id,
        error: errorMessage,
      },
    });

    throw error;
  }
}

