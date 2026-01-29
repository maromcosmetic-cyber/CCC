/**
 * Brand Identity Playbook Reader
 * 
 * Reads and parses the full Brand Identity Playbook from projects.brand_identity
 * Provides structured access to all 19 modules for AI context
 */

import { BrandIdentityPlaybook } from '@/types/models';
import { createServiceRoleClient } from '@/lib/auth/server';

/**
 * Read brand identity playbook from project
 */
export async function readPlaybook(projectId: string): Promise<BrandIdentityPlaybook | null> {
  const supabase = createServiceRoleClient();

  const { data: project, error } = await supabase
    .from('projects')
    .select('brand_identity, name, website_url')
    .eq('id', projectId)
    .single();

  if (error || !project) {
    console.error('Failed to fetch project:', error);
    return null;
  }

  return (project.brand_identity as BrandIdentityPlaybook) || null;
}

/**
 * Format playbook as text for AI context
 * Similar to generatePlaybookText() function but as a reusable service
 */
export function formatPlaybookAsText(playbook: BrandIdentityPlaybook, projectName?: string): string {
  let text = `========================================\n`;
  text += `${projectName || 'BRAND'} MASTER PLAYBOOK\n`;
  text += `========================================\n\n`;
  text += `Generated: ${new Date().toLocaleDateString()}\n`;
  text += `CONFIDENTIAL - Strategic Brand Intelligence\n\n`;

  // Helper function to add section
  const addSection = (title: string, data: any, keys: string[]) => {
    if (data && Object.keys(data).length > 0) {
      text += `\n${title}\n${'='.repeat(title.length)}\n\n`;
      for (const key of keys) {
        const value = data[key];
        if (value) {
          const label = key.replace(/_/g, ' ').toUpperCase();
          if (Array.isArray(value)) {
            text += `${label}:\n`;
            value.forEach((item) => (text += `  - ${item}\n`));
            text += `\n`;
          } else if (typeof value === 'object') {
            text += `${label}:\n${JSON.stringify(value, null, 2)}\n\n`;
          } else {
            text += `${label}: ${value}\n\n`;
          }
        }
      }
    }
  };

  // Add all 19 modules
  if (playbook.dna) {
    addSection(
      '1. BRAND DNA & PHILOSOPHY',
      playbook.dna,
      [
        'name',
        'problem_solved',
        'origin_story',
        'origin_motivation',
        'mission',
        'vision',
        'world_problem',
        'emotional_outcome',
        'emotional_outcome_goal',
        'differentiator',
        'anti_identity',
        'values',
        'ethical_boundaries',
        'non_negotiable_standards',
        'standards',
        'ten_year_vision',
        'ten_year_identity',
        'company_identity_goal',
      ]
    );
  }

  if (playbook.product) {
    addSection('2. PRODUCT INTELLIGENCE', playbook.product, [
      'name',
      'category',
      'main_benefits',
      'unique_features',
      'quality_level',
      'price_point',
      'why_choose_us',
      'objections',
    ]);
  }

  if (playbook.product_intelligence) {
    addSection('2B. PRODUCT INTELLIGENCE LAYER', playbook.product_intelligence, [
      'hero_products',
      'support_products',
      'upsell_products',
      'emotional_purposes',
    ]);
  }

  if (playbook.audience) {
    addSection('3. TARGET AUDIENCE & PSYCHOLOGY', playbook.audience, [
      'ideal_customer',
      'demographics',
      'pain_points',
      'desires',
      'fears',
      'shopping_behavior',
      'influences',
    ]);
  }

  if (playbook.audience_intelligence) {
    addSection('3B. AUDIENCE INTELLIGENCE', playbook.audience_intelligence, [
      'emotional_triggers',
      'identity_drivers',
      'language_style',
      'content_behavior',
      'buying_objections',
      'decision_logic',
    ]);
  }

  if (playbook.positioning) {
    addSection('4. STRATEGIC POSITIONING', playbook.positioning, [
      'market_category',
      'sub_category',
      'subcategory_to_own',
      'target_audience',
      'not_for',
      'remembered_for',
      'dominant_idea',
      'dominant_brand_idea',
      'positioning_statement',
    ]);
  }

  if (playbook.market) {
    addSection('5. MARKET & COMPETITION', playbook.market, ['competitors', 'positioning', 'market_gap']);
  }

  if (playbook.offer) {
    addSection('6. OFFER STRUCTURE', playbook.offer, ['price_strategy', 'bundles', 'subscriptions']);
  }

  if (playbook.offer_architecture) {
    addSection('6B. OFFER ARCHITECTURE', playbook.offer_architecture, [
      'entry_offers',
      'core_offers',
      'high_ticket_offers',
      'scarcity_triggers',
      'urgency_logic',
      'risk_reversal_methods',
    ]);
  }

  if (playbook.journey) {
    addSection('7. CUSTOMER JOURNEY', playbook.journey, ['discovery', 'hesitation', 'after_purchase']);
  }

  if (playbook.funnel_psychology) {
    addSection('7B. FUNNEL PSYCHOLOGY', playbook.funnel_psychology, ['stages']);
  }

  if (playbook.narrative) {
    addSection('8. NARRATIVE ARCHITECTURE', playbook.narrative, [
      'hero',
      'villain',
      'guide',
      'struggle',
      'transformation',
      'outcome',
      'story_templates',
    ]);
  }

  if (playbook.pain_matrix) {
    if (Array.isArray(playbook.pain_matrix)) {
      text += `\n9. PROBLEM MATRIX & PAIN HIERARCHY\n${'='.repeat(42)}\n\n`;
      playbook.pain_matrix.forEach((pain, idx) => {
        text += `Pain ${idx + 1}: ${JSON.stringify(pain, null, 2)}\n\n`;
      });
    } else {
      addSection('9. PROBLEM MATRIX & PAIN HIERARCHY', playbook.pain_matrix, [
        'physical_problems',
        'emotional_problems',
        'social_problems',
        'financial_problems',
        'identity_problems',
      ]);
    }
  }

  if (playbook.content_pillars) {
    if (Array.isArray(playbook.content_pillars)) {
      text += `\n10. CONTENT PILLAR SYSTEM\n${'='.repeat(27)}\n\n`;
      playbook.content_pillars.forEach((pillar, idx) => {
        text += `Pillar ${idx + 1}: ${JSON.stringify(pillar, null, 2)}\n\n`;
      });
    } else {
      addSection('10. CONTENT PILLAR SYSTEM', playbook.content_pillars, ['pillar_1', 'pillar_2', 'pillar_3', 'pillar_4']);
    }
  }

  if (playbook.trust_infrastructure) {
    addSection('11. TRUST INFRASTRUCTURE', playbook.trust_infrastructure, [
      'social_proof_types',
      'testimonial_style',
      'certifications',
      'partnerships',
      'media_mentions',
      'guarantees',
      'transparency_rules',
    ]);
  }

  if (playbook.community_model) {
    addSection('12. COMMUNITY MODEL', playbook.community_model, [
      'customer_treatment_philosophy',
      'customer_treatment_rules',
      'problem_resolution_protocol',
      'problem_response_protocol',
      'criticism_handling',
      'loyalty_building_tactics',
      'community_building_strategy',
    ]);
  }

  if (playbook.platform_strategy) {
    addSection('13. PLATFORM STRATEGY', playbook.platform_strategy, [
      'primary_platforms',
      'platform_tone_adjustments',
      'content_types_per_platform',
      'facebook',
      'instagram',
      'tiktok',
    ]);
  }

  if (playbook.long_term_vision || playbook.expansion_vision) {
    const visionData = playbook.long_term_vision || playbook.expansion_vision;
    addSection('14. LONG-TERM VISION', visionData, [
      'future_products',
      'future_markets',
      'future_positioning',
      'brand_evolution_path',
    ]);
  }

  if (playbook.kpis_optimization || playbook.kpis) {
    const kpisData = playbook.kpis_optimization || playbook.kpis;
    addSection('15. KPIs & OPTIMIZATION', kpisData, ['success_metrics', 'benchmarks', 'growth_targets']);
  }

  if (playbook.ai_autonomy_rules) {
    addSection('16. AI AUTONOMY RULES', playbook.ai_autonomy_rules, [
      'can_decide_alone',
      'requires_approval',
      'forbidden_actions',
      'escalation_logic',
      'risk_thresholds',
    ]);
  }

  if (playbook.voice) {
    addSection('17. VOICE & TONE', playbook.voice, [
      'tone_adjectives',
      'personality_traits',
      'archetype',
      'vocabulary_style',
      'language_style',
      'humor_level',
      'authority_level',
      'emotional_range',
      'emotional_driver',
      'perspective',
      'sentence_structure',
      'words_to_use',
      'words_to_avoid',
      'on_brand_phrases',
      'forbidden_phrases',
    ]);
  }

  if (playbook.guardrails) {
    addSection('18. BRAND GUARDRAILS', playbook.guardrails, [
      'regulatory_limits',
      'forbidden_topics',
      'forbidden_words',
      'allowed_claims',
      'forbidden_claims',
      'visual_rules',
      'tone_limits',
      'cultural_sensitivities',
      'platform_policies',
    ]);
  }

  if (playbook.visual || playbook.visuals) {
    const visualData = playbook.visual || playbook.visuals;
    text += `\n19. VISUAL IDENTITY & AESTHETIC\n${'='.repeat(36)}\n\n`;

    if (visualData.colors) {
      text += `COLORS:\n`;
      if (visualData.colors.primary) {
        text += `Primary: ${visualData.colors.primary.map((c: any) => c.hex || c).join(', ')}\n`;
      }
      if (visualData.colors.secondary) {
        text += `Secondary: ${visualData.colors.secondary.map((c: any) => c.hex || c).join(', ')}\n`;
      }
      if (visualData.colors.accent) {
        text += `Accent: ${visualData.colors.accent.map((c: any) => c.hex || c).join(', ')}\n`;
      }
      if (Array.isArray(visualData.colors)) {
        text += `Colors: ${visualData.colors.join(', ')}\n`;
      }
      text += `\n`;
    }

    if (visualData.typography) {
      text += `TYPOGRAPHY:\n`;
      if (visualData.typography.headings) {
        text += `Headings: ${visualData.typography.headings.map((f: any) => f.family || f).join(', ')}\n`;
      }
      if (visualData.typography.body) {
        text += `Body: ${visualData.typography.body.map((f: any) => f.family || f).join(', ')}\n`;
      }
      if (Array.isArray(visualData.fonts)) {
        text += `Fonts: ${visualData.fonts.join(', ')}\n`;
      }
      text += `\n`;
    }

    if (visualData.image_style) {
      text += `IMAGE STYLE: ${visualData.image_style}\n\n`;
    }
    if (visualData.mood) {
      text += `VISUAL MOOD: ${visualData.mood}\n\n`;
    }
    if (visualData.aesthetic) {
      text += `AESTHETIC: ${visualData.aesthetic}\n\n`;
    }
  }

  return text;
}

/**
 * Extract visual identity for scene planning
 */
export function extractVisualIdentity(playbook: BrandIdentityPlaybook): {
  colors: string[];
  mood: string;
  imageStyle: string;
  aesthetic: string;
} {
  const visual = playbook.visual || playbook.visuals || {};
  
  const colors: string[] = [];
  if (visual.colors) {
    if (visual.colors.primary) {
      colors.push(...visual.colors.primary.map((c: any) => c.hex || c));
    }
    if (visual.colors.secondary) {
      colors.push(...visual.colors.secondary.map((c: any) => c.hex || c));
    }
    if (visual.colors.accent) {
      colors.push(...visual.colors.accent.map((c: any) => c.hex || c));
    }
    if (Array.isArray(visual.colors)) {
      colors.push(...visual.colors);
    }
  }

  return {
    colors: colors.filter(Boolean),
    mood: visual.mood || '',
    imageStyle: visual.image_style || '',
    aesthetic: visual.aesthetic || '',
  };
}

/**
 * Extract brand voice for scene planning
 */
export function extractBrandVoice(playbook: BrandIdentityPlaybook): {
  tone: string[];
  personality: string[];
  style: string;
} {
  const voice = playbook.voice || {};

  return {
    tone: voice.tone_adjectives || voice.personality_traits || [],
    personality: voice.personality_traits || [],
    style: voice.vocabulary_style || voice.language_style || '',
  };
}
