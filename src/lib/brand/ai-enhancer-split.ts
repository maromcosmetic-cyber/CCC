/**
 * Split AI Enhancement - One call per tab for reliability
 * Generates detailed, complete data for each module separately
 */

import OpenAI from 'openai';
import { WebsiteAnalysisResult } from './website-analyzer';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Enhance Tab 1: Brand Identity (DNA, Product, Audience, Positioning, Market, Offer, Journey)
 */
export async function enhanceTab1Identity(rawData: WebsiteAnalysisResult): Promise<any> {
  console.log('🧠 Tab 1: Enhancing Brand Identity...');

  const prompt = `Analyze this website and extract Brand Identity data:

BRAND: ${rawData.content.title}
ABOUT: ${rawData.content.about.substring(0, 2000)}
PRODUCTS: ${rawData.content.products.substring(0, 2000)}
TAGLINE: ${rawData.content.tagline}

Return DETAILED JSON (2-4 sentences per field, escape quotes properly):
{
  "dna": {
    "name": "${rawData.content.title}",
    "problem_solved": "3-4 sentences on core problem",
    "origin_story": "3-4 sentences on brand story",
    "mission": "3-4 sentences on mission",
    "vision": "3-4 sentences on 10-year vision",
    "world_problem": "3 sentences",
    "emotional_outcome": "3 sentences",
    "differentiator": "4 sentences on uniqueness",
    "anti_identity": "2 sentences on what brand refuses to be",
    "values": ["Value 1 explained", "Value 2", "Value 3", "Value 4", "Value 5"],
    "ethical_boundaries": ["Boundary 1", "Boundary 2", "Boundary 3", "Boundary 4"],
    "standards": ["Standard 1", "Standard 2", "Standard 3", "Standard 4"],
    "ten_year_identity": "4 sentences on future"
  },
  "product": {
    "name": "main product name",
    "category": "category",
    "main_benefits": "4-5 sentences",
    "unique_features": "4 sentences with specifics",
    "quality_level": "2 sentences",
    "price_point": "2 sentences",
    "why_choose_us": "5 sentences"
  },
  "audience": {
    "ideal_customer": "5-6 sentences painting vivid picture",
    "pain_points": "4 sentences",
    "desires": "3 sentences",
    "fears": "3 sentences",
    "shopping_behavior": "3 sentences",
    "influences": "2 sentences"
  },
  "positioning": {
    "market_category": "category",
    "sub_category": "sub-category",
    "target_audience": "3 sentences",
    "not_for": ["Type 1", "Type 2", "Type 3", "Type 4"],
    "remembered_for": "3 sentences",
    "dominant_idea": "2 sentences"
  },
  "market": {
    "competitors": "4 sentences naming competitors",
    "positioning": "4 sentences on how we position vs them",
    "market_gap": "4 sentences on opportunity"
  },
  "offer": {
    "price_strategy": "3 sentences",
    "bundles": "2 sentences",
    "subscriptions": "2 sentences"
  },
  "journey": {
    "discovery": "3 sentences",
    "hesitation": "3 sentences",
    "after_purchase": "3 sentences"
  }
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 2500,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}

/**
 * Enhance Tab 2: Visual Identity
 */
export async function enhanceTab2Visual(rawData: WebsiteAnalysisResult): Promise<any> {
  console.log('🧠 Tab 2: Visual Identity (using scraped data)...');
  
  // Visual data comes directly from scraper, just format it
  return {
    visual: {
      colors: {
        primary: rawData.visuals.colors.map(c => ({
          hex: c.hex,
          rgb: c.rgb,
          name: `Color ${c.hex}`,
          psychology: `Used in: ${c.context.join(', ')}`,
          usage: c.context.join(', ')
        }))
      },
      typography: {
        headings: rawData.visuals.fonts
          .filter(f => f.category === 'heading')
          .map(f => ({
            family: f.family,
            personality: `Heading font: ${f.family}`,
            usage: f.usage.join(', ')
          })),
        body: rawData.visuals.fonts
          .filter(f => f.category === 'body')
          .map(f => ({
            family: f.family,
            personality: `Body font: ${f.family}`,
            usage: f.usage.join(', ')
          }))
      },
      logo: {
        url: rawData.visuals.logo.url,
        source: rawData.visuals.logo.source,
        alt: rawData.visuals.logo.alt || 'Brand logo'
      },
      image_style: 'Determined from website imagery',
      mood: 'Determined from overall aesthetic'
    }
  };
}

/**
 * Enhance Tab 3: Voice & Tone
 */
export async function enhanceTab3Voice(rawData: WebsiteAnalysisResult): Promise<any> {
  console.log('🧠 Tab 3: Enhancing Voice & Tone...');

  const prompt = `Analyze the brand voice from this content:

CONTENT: ${rawData.content.about.substring(0, 1500)}
HEADLINES: ${rawData.content.headlines.join(' | ')}
PRODUCTS: ${rawData.content.products.substring(0, 1500)}

Return JSON with voice analysis:
{
  "voice": {
    "personality_traits": ["Trait 1", "Trait 2", "Trait 3", "Trait 4", "Trait 5", "Trait 6"],
    "vocabulary_style": "3 sentences on word choice",
    "humor_level": "2 sentences",
    "authority_level": "2 sentences",
    "emotional_range": "2 sentences",
    "words_to_use": ["word1", "word2", "word3", "word4", "word5", "word6", "word7", "word8"],
    "words_to_avoid": ["word1", "word2", "word3", "word4", "word5", "word6"],
    "on_brand_phrases": ["phrase 1", "phrase 2", "phrase 3", "phrase 4", "phrase 5"],
    "forbidden_phrases": ["phrase 1", "phrase 2", "phrase 3", "phrase 4"]
  }
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 1500,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}

/**
 * Enhance Tab 4: Strategy & Story
 */
export async function enhanceTab4Strategy(rawData: WebsiteAnalysisResult): Promise<any> {
  console.log('🧠 Tab 4: Enhancing Strategy & Story...');

  const prompt = `Create strategic story framework:

BRAND: ${rawData.content.title}
STORY: ${rawData.content.about.substring(0, 1500)}
PRODUCTS: ${rawData.content.products.substring(0, 1500)}

Return JSON:
{
  "narrative": {
    "hero": "2-3 sentences on customer as hero",
    "villain": "2 sentences on the problem",
    "guide": "2-3 sentences on brand as guide",
    "transformation": "3 sentences on journey",
    "outcome": "2 sentences on result"
  },
  "pain_matrix": {
    "physical_problems": "3 sentences",
    "emotional_problems": "3 sentences",
    "social_problems": "2 sentences",
    "financial_problems": "2 sentences",
    "identity_problems": "3 sentences"
  },
  "content_pillars": {
    "pillar_1": "Pillar Name: 3 sentences explaining purpose",
    "pillar_2": "Pillar Name: 3 sentences",
    "pillar_3": "Pillar Name: 3 sentences",
    "pillar_4": "Pillar Name: 3 sentences"
  }
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
    max_tokens: 1500,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}

/**
 * Enhance Tab 5: Trust & Community
 */
export async function enhanceTab5Trust(rawData: WebsiteAnalysisResult): Promise<any> {
  console.log('🧠 Tab 5: Enhancing Trust & Community...');

  const prompt = `Create trust and community strategy:

BRAND: ${rawData.content.title}
CONTENT: ${rawData.content.about.substring(0, 1000)}

Return JSON:
{
  "trust_infrastructure": {
    "social_proof_types": ["Type 1", "Type 2", "Type 3", "Type 4", "Type 5"],
    "certifications": ["Cert 1", "Cert 2", "Cert 3", "Cert 4"],
    "partnerships": ["Partner 1", "Partner 2", "Partner 3"],
    "media_mentions": ["Mention 1", "Mention 2", "Mention 3"],
    "guarantees": ["Guarantee 1", "Guarantee 2", "Guarantee 3", "Guarantee 4"]
  },
  "community_model": {
    "customer_treatment_philosophy": "4 sentences on how we treat customers",
    "problem_resolution_protocol": "3 sentences on handling issues",
    "loyalty_building_tactics": "3 sentences on retention",
    "community_building_strategy": "3 sentences on community"
  },
  "platform_strategy": {
    "primary_platforms": "3 sentences on main platforms",
    "platform_tone_adjustments": "2 sentences on adapting tone",
    "content_types_per_platform": "3 sentences on content strategy"
  }
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 1500,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}

/**
 * Enhance Tab 6: Growth & Rules
 */
export async function enhanceTab6Growth(rawData: WebsiteAnalysisResult): Promise<any> {
  console.log('🧠 Tab 6: Enhancing Growth & Rules...');

  const prompt = `Create growth strategy and guardrails:

BRAND: ${rawData.content.title}
CATEGORY: ${rawData.content.keywords.join(', ')}

Return JSON:
{
  "long_term_vision": {
    "future_products": "3 sentences on product expansion",
    "future_markets": "2 sentences on new markets",
    "future_positioning": "2 sentences on positioning evolution",
    "brand_evolution_path": "4 sentences on transformation"
  },
  "kpis_optimization": {
    "success_metrics": ["KPI 1", "KPI 2", "KPI 3", "KPI 4", "KPI 5", "KPI 6"],
    "benchmarks": "3 sentences on performance targets",
    "growth_targets": "2 sentences on goals"
  },
  "ai_autonomy_rules": {
    "can_decide_alone": ["Decision 1", "Decision 2", "Decision 3", "Decision 4", "Decision 5"],
    "requires_approval": ["Decision 1", "Decision 2", "Decision 3", "Decision 4"],
    "forbidden_actions": ["Action 1", "Action 2", "Action 3", "Action 4"],
    "escalation_logic": "2 sentences on when to escalate"
  },
  "guardrails": {
    "regulatory_limits": ["Limit 1", "Limit 2", "Limit 3", "Limit 4"],
    "cultural_sensitivities": ["Item 1", "Item 2", "Item 3", "Item 4"],
    "platform_policies": ["Policy 1", "Policy 2", "Policy 3", "Policy 4"],
    "forbidden_claims": ["Claim 1", "Claim 2", "Claim 3", "Claim 4", "Claim 5"]
  }
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 1500,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}

/**
 * Enhance all tabs sequentially
 */
export async function enhanceAllTabs(rawData: WebsiteAnalysisResult): Promise<any> {
  console.log('🚀 Starting sequential tab enhancement...');
  
  try {
    const tab1 = await enhanceTab1Identity(rawData);
    console.log('✅ Tab 1 complete');
    
    const tab2 = await enhanceTab2Visual(rawData);
    console.log('✅ Tab 2 complete');
    
    const tab3 = await enhanceTab3Voice(rawData);
    console.log('✅ Tab 3 complete');
    
    const tab4 = await enhanceTab4Strategy(rawData);
    console.log('✅ Tab 4 complete');
    
    const tab5 = await enhanceTab5Trust(rawData);
    console.log('✅ Tab 5 complete');
    
    const tab6 = await enhanceTab6Growth(rawData);
    console.log('✅ Tab 6 complete');
    
    // Merge all tabs
    const result = {
      ...tab1,
      ...tab2,
      ...tab3,
      ...tab4,
      ...tab5,
      ...tab6
    };
    
    console.log('✅ All tabs merged successfully');
    return result;
    
  } catch (error) {
    console.error('❌ Tab enhancement error:', error);
    throw error;
  }
}

