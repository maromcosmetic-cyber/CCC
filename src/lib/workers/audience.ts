// Audience generation worker job handler

import { AudienceJobData } from '../queue/jobs';
import { KieAIProvider } from '../providers/kie/KieAIProvider';
import { supabaseAdmin } from '../db/client';
import { logAuditEvent } from '../audit/logger';
import { logCost } from '../costs/tracker';
import { getTemplate } from '../prompts/templates';
import { renderTemplate } from '../prompts/render';

export async function generateAudienceJob(data: AudienceJobData): Promise<void> {
  const { project_id, user_prompt, company_profile_version_id, target_version } = data;

  try {
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

    // AI enhances the user prompt based on company profile
    const enhancedPrompt = user_prompt
      ? `Based on the company profile, enhance this audience targeting prompt: "${user_prompt}". 
         Consider the brand identity, target market, and product catalog from the company profile.
         Make it more specific and aligned with the company's actual business.`
      : `Create audience segments based on the company profile. Consider the brand identity, 
         target market, and product catalog.`;

    // Get prompt template
    const template = getTemplate('AUDIENCE_SEGMENTATION');
    if (!template) {
      throw new Error('Audience segmentation template not found');
    }

    // Render prompt
    const prompt = renderTemplate(template, {
      company_profile: JSON.stringify(companyProfile.profile_data, null, 2),
      user_prompt: user_prompt || '',
      enhanced_prompt: enhancedPrompt,
    });

    // LLM is platform-managed - uses Kie AI unified gateway
    const llm = new KieAIProvider();
    const response = await llm.generate(prompt, {
      json_schema: template.json_schema,
    });

    if (!response.structured || !response.structured.segments) {
      throw new Error('Failed to generate audience segments');
    }

    // Get next version number
    const { data: existingAudiences } = await supabaseAdmin
      ?.from('audience_segments')
      .select('version')
      .eq('project_id', project_id)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = existingAudiences && existingAudiences.length > 0
      ? existingAudiences[0].version + 1
      : 1;

    // Create audience segments
    const segments = response.structured.segments;
    const createdSegments = [];

    for (const segment of segments) {
      const { data: audience, error } = await supabaseAdmin
        ?.from('audience_segments')
        .insert({
          project_id,
          version: nextVersion,
          name: segment.name,
          description: segment.description,
          company_profile_version_id: companyProfile.id,
          user_prompt: user_prompt || null,
          ai_enhanced_prompt: enhancedPrompt,
          targeting: segment.targeting,
          platform_specific_configs: segment.platform_configs || {},
          ai_suggested: true,
          evidence_refs: [
            {
              source_url: 'company_profile',
              snippet: 'Generated from company profile data',
              page_id: companyProfile.id,
            },
          ],
        })
        .select()
        .single();

      if (audience) {
        createdSegments.push(audience);
      }

      if (error) {
        console.error('Failed to create audience segment:', error);
      }
    }

    // Log audit event
    await logAuditEvent({
      event_type: 'audience_generated',
      actor_type: 'worker',
      source: 'worker',
      project_id,
      payload: {
        segments_count: createdSegments.length,
        company_profile_version_id: companyProfile.id,
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
      event_type: 'audience_generation_failed',
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

