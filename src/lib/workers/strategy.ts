// Strategy generation worker job handler

import { StrategyJobData } from '../queue/jobs';
import { KieAIProvider } from '../providers/kie/KieAIProvider';
import { supabaseAdmin } from '../db/client';
import { logAuditEvent } from '../audit/logger';
import { logCost } from '../costs/tracker';
import { getTemplate } from '../prompts/templates';
import { renderTemplate } from '../prompts/render';

export async function generateStrategyJob(data: StrategyJobData): Promise<void> {
  const { project_id, company_profile_version_id, target_version } = data;

  try {
    // Get project for budget info
    const { data: project } = await supabaseAdmin
      ?.from('projects')
      .select('*')
      .eq('id', project_id)
      .single();

    if (!project) {
      throw new Error('Project not found');
    }

    // Get company profile
    let companyProfile;
    if (company_profile_version_id) {
      const { data: profile } = await supabaseAdmin
        ?.from('company_profiles')
        .select('*')
        .eq('id', company_profile_version_id)
        .single();
      companyProfile = profile;
    } else {
      // Get latest locked profile
      const { data: profiles } = await supabaseAdmin
        ?.from('company_profiles')
        .select('*')
        .eq('project_id', project_id)
        .not('locked_at', 'is', null)
        .order('version', { ascending: false })
        .limit(1);
      companyProfile = profiles?.[0];
    }

    if (!companyProfile) {
      throw new Error('No company profile found');
    }

    // Get prompt template
    const template = getTemplate('UNIFIED_STRATEGY_BUDGETED');
    if (!template) {
      throw new Error('Strategy template not found');
    }

    // Render prompt
    const prompt = renderTemplate(template, {
      company_profile: JSON.stringify(companyProfile.profile_data, null, 2),
      monthly_budget: project.monthly_budget_amount.toString(),
      budget_currency: project.monthly_budget_currency,
      target_regions: JSON.stringify(project.target_regions || []),
      primary_channels: JSON.stringify(project.primary_channels || []),
    });

    // LLM is platform-managed - uses Kie AI unified gateway
    const llm = new KieAIProvider();
    const response = await llm.generate(prompt, {
      json_schema: template.json_schema,
    });

    if (!response.structured) {
      throw new Error('Failed to generate structured strategy');
    }

    // Get next version number
    const { data: existingStrategies } = await supabaseAdmin
      ?.from('strategies')
      .select('version')
      .eq('project_id', project_id)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = existingStrategies && existingStrategies.length > 0
      ? existingStrategies[0].version + 1
      : 1;

    // Create strategy
    const { data: strategy, error } = await supabaseAdmin
      ?.from('strategies')
      .insert({
        project_id,
        version: nextVersion,
        company_profile_version_id: companyProfile.id,
        strategy_data: response.structured,
        evidence_refs: companyProfile.evidence_refs || [],
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create strategy: ${error.message}`);
    }

    // Log audit event
    await logAuditEvent({
      event_type: 'strategy_generated',
      actor_type: 'worker',
      source: 'worker',
      project_id,
      payload: {
        strategy_id: strategy.id,
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
      event_type: 'strategy_generation_failed',
      actor_type: 'worker',
      source: 'worker',
      project_id,
      payload: {
        error: errorMessage,
      },
    });

    throw error;
  }
}

