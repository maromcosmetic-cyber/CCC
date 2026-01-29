/**
 * AI Enhancement Layer
 * Transforms raw scraped data into strategic, well-formulated brand intelligence
 */

import { openai } from '@/lib/openai';
import { WebsiteAnalysisResult, ColorData, FontData } from './website-analyzer';

export interface EnhancedBrandIdentity {
  // Brand DNA
  dna: {
    name: string;
    problem_solved: string;
    origin_story: string;
    mission: string;
    vision: string;
    world_problem: string;
    emotional_outcome: string;
    differentiator: string;
    anti_identity: string;
    values: string[];
    ethical_boundaries: string[];
    standards: string[];
    ten_year_identity: string;
  };

  // Product Intelligence
  product: {
    name: string;
    category: string;
    main_benefits: string;
    unique_features: string;
    quality_level: string;
    price_point: string;
    why_choose_us: string;
  };

  // Target Audience
  audience: {
    ideal_customer: string;
    pain_points: string;
    desires: string;
    fears: string;
    shopping_behavior: string;
    influences: string;
  };

  // Strategic Positioning
  positioning: {
    market_category: string;
    sub_category: string;
    target_audience: string;
    not_for: string[];
    remembered_for: string;
    dominant_idea: string;
  };

  // Market & Competition
  market: {
    competitors: string;
    positioning: string;
    market_gap: string;
  };

  // Offer Structure
  offer: {
    price_strategy: string;
    bundles: string;
    subscriptions: string;
  };

  // Customer Journey
  journey: {
    discovery: string;
    hesitation: string;
    after_purchase: string;
  };

  // Narrative Architecture
  narrative: {
    hero: string;
    villain: string;
    guide: string;
    transformation: string;
    outcome: string;
  };

  // Pain Matrix
  pain_matrix: {
    physical_problems: string;
    emotional_problems: string;
    social_problems: string;
    financial_problems: string;
    identity_problems: string;
  };

  // Content Pillars
  content_pillars: {
    pillar_1: string;
    pillar_2: string;
    pillar_3: string;
    pillar_4?: string;
  };

  // Trust Infrastructure
  trust_infrastructure: {
    social_proof_types: string[];
    certifications: string[];
    partnerships: string[];
    media_mentions: string[];
    guarantees: string[];
  };

  // Community Model
  community_model: {
    customer_treatment_philosophy: string;
    problem_resolution_protocol: string;
    loyalty_building_tactics: string;
    community_building_strategy: string;
  };

  // Platform Strategy
  platform_strategy: {
    primary_platforms: string;
    platform_tone_adjustments: string;
    content_types_per_platform: string;
  };

  // Long-Term Vision
  long_term_vision: {
    future_products: string;
    future_markets: string;
    future_positioning: string;
    brand_evolution_path: string;
  };

  // KPIs & Optimization
  kpis_optimization: {
    success_metrics: string[];
    benchmarks: string;
    growth_targets: string;
  };

  // AI Autonomy Rules
  ai_autonomy_rules: {
    can_decide_alone: string[];
    requires_approval: string[];
    forbidden_actions: string[];
    escalation_logic: string;
  };

  // Visual Identity
  visual: {
    colors: {
      primary: { hex: string; name: string; psychology: string; usage: string }[];
      secondary: { hex: string; name: string; psychology: string; usage: string }[];
      accent: { hex: string; name: string; psychology: string; usage: string }[];
    };
    typography: {
      headings: { family: string; personality: string; usage: string }[];
      body: { family: string; personality: string; usage: string }[];
      display: { family: string; personality: string; usage: string }[];
    };
    logo: {
      url: string;
      description: string;
    };
    image_style: string;
    mood: string;
  };

  // Voice & Tone
  voice: {
    personality_traits: string[];
    vocabulary_style: string;
    humor_level: string;
    authority_level: string;
    emotional_range: string;
    words_to_use: string[];
    words_to_avoid: string[];
    on_brand_phrases: string[];
    forbidden_phrases: string[];
  };

  // Guardrails
  guardrails: {
    regulatory_limits: string[];
    cultural_sensitivities: string[];
    platform_policies: string[];
    forbidden_claims: string[];
  };
}

/**
 * Enhance raw website data with AI intelligence
 */
export async function enhanceBrandIdentity(
  rawData: WebsiteAnalysisResult
): Promise<EnhancedBrandIdentity> {
  console.log('🧠 AI enhancing brand identity...');
  console.log(`📊 Input: ${rawData.content.title} | ${rawData.visuals.colors.length} colors | ${rawData.visuals.fonts.length} fonts`);

  const prompt = `Analyze this website and create a detailed brand strategy based STRICTLY on the scraped content below. DO NOT make up generic content - use ONLY what you see here.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACTUAL WEBSITE DATA (USE THIS EXACT INFORMATION):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BRAND NAME: ${rawData.content.title}
TAGLINE: ${rawData.content.tagline}

ABOUT/STORY:
${rawData.content.about.substring(0, 2500)}

META DESCRIPTION: ${rawData.content.metaDescription}
KEYWORDS: ${rawData.content.keywords.join(', ')}
HEADLINES: ${rawData.content.headlines.join(' | ')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRODUCTS FROM WEBSITE (USE THESE EXACT PRODUCTS):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${rawData.content.products.substring(0, 2500)}

CRITICAL: Base your entire strategy on the ACTUAL products, ingredients, benefits, and brand story above. 
DO NOT invent products or features that aren't mentioned. 
DO NOT use generic wellness/beauty language - use the SPECIFIC language and claims from this website.

COLORS (use EXACTLY these): ${rawData.visuals.colors.map(c => c.hex).join(', ')}
FONTS (use EXACTLY these): ${rawData.visuals.fonts.map(f => f.family).join(', ') || 'Sans-serif'}
LOGO: ${rawData.visuals.logo.url}

Return comprehensive JSON with DETAILED content (remember to escape quotes with backslash):
{
  "dna": {"name":"brand name","problem_solved":"3-5 detailed sentences explaining the core problem and why it matters","origin_story":"3-5 sentences about brand founding","mission":"3-4 sentences on daily brand mission","vision":"3-4 sentences on 10-year vision","world_problem":"3-4 sentences on bigger problem","emotional_outcome":"3-4 sentences on transformation","differentiator":"3-5 sentences on what makes this different","anti_identity":"2-3 sentences on what brand refuses to be","values":["Value 1 with explanation","Value 2","Value 3","Value 4","Value 5"],"ethical_boundaries":["Boundary 1","Boundary 2","Boundary 3","Boundary 4"],"standards":["Standard 1","Standard 2","Standard 3","Standard 4"],"ten_year_identity":"3-5 sentences on future reputation"},
  "product": {"name":"product name","category":"category","main_benefits":"3-5 sentences","unique_features":"3-4 sentences","quality_level":"2-3 sentences","price_point":"2 sentences","why_choose_us":"4-5 sentences"},
  "audience": {"ideal_customer":"4-6 sentences painting vivid picture","pain_points":"3-5 sentences","desires":"3-4 sentences","fears":"3-4 sentences","shopping_behavior":"3-4 sentences","influences":"2-3 sentences"},
  "positioning": {"market_category":"category","sub_category":"sub-category","target_audience":"3 sentences","not_for":["Type 1","Type 2","Type 3","Type 4"],"remembered_for":"2-3 sentences","dominant_idea":"2 sentences"},
  "market": {"competitors":"3-4 sentences","positioning":"3-4 sentences","market_gap":"3-5 sentences"},
  "offer": {"price_strategy":"3 sentences","bundles":"2 sentences","subscriptions":"2 sentences"},
  "journey": {"discovery":"3 sentences","hesitation":"3 sentences","after_purchase":"3 sentences"},
  "narrative": {"hero":"2 sentences","villain":"2 sentences","guide":"2 sentences","transformation":"3 sentences","outcome":"2 sentences"},
  "pain_matrix": {"physical_problems":"3 sentences","emotional_problems":"3 sentences","social_problems":"2 sentences","financial_problems":"2 sentences","identity_problems":"3 sentences"},
  "content_pillars": {"pillar_1":"Pillar Name: 2-3 sentences","pillar_2":"Pillar Name: 2-3 sentences","pillar_3":"Pillar Name: 2-3 sentences","pillar_4":"Pillar Name: 2-3 sentences"},
  "trust_infrastructure": {"social_proof_types":["Type 1","Type 2","Type 3","Type 4","Type 5"],"certifications":["Cert 1","Cert 2","Cert 3"],"partnerships":["Partner 1","Partner 2"],"media_mentions":["Mention 1","Mention 2"],"guarantees":["Guarantee 1","Guarantee 2","Guarantee 3","Guarantee 4"]},
  "community_model": {"customer_treatment_philosophy":"3-4 sentences","problem_resolution_protocol":"2-3 sentences","loyalty_building_tactics":"3 sentences","community_building_strategy":"3 sentences"},
  "platform_strategy": {"primary_platforms":"2-3 sentences","platform_tone_adjustments":"2 sentences","content_types_per_platform":"2-3 sentences"},
  "long_term_vision": {"future_products":"3 sentences","future_markets":"2 sentences","future_positioning":"2 sentences","brand_evolution_path":"3-4 sentences"},
  "kpis_optimization": {"success_metrics":["KPI 1","KPI 2","KPI 3","KPI 4","KPI 5"],"benchmarks":"2 sentences","growth_targets":"2 sentences"},
  "ai_autonomy_rules": {"can_decide_alone":["Decision 1","Decision 2","Decision 3","Decision 4"],"requires_approval":["Decision 1","Decision 2","Decision 3","Decision 4"],"forbidden_actions":["Action 1","Action 2","Action 3","Action 4"],"escalation_logic":"2 sentences"},
  "voice": {"personality_traits":["Trait 1","Trait 2","Trait 3","Trait 4","Trait 5"],"vocabulary_style":"2-3 sentences","humor_level":"1-2 sentences","authority_level":"1-2 sentences","emotional_range":"2 sentences","words_to_use":["word1","word2","word3","word4","word5","word6"],"words_to_avoid":["word1","word2","word3","word4","word5"],"on_brand_phrases":["phrase 1","phrase 2","phrase 3","phrase 4"],"forbidden_phrases":["phrase 1","phrase 2","phrase 3","phrase 4"]},
  "guardrails": {"regulatory_limits":["Limit 1","Limit 2","Limit 3","Limit 4"],"cultural_sensitivities":["Item 1","Item 2","Item 3"],"platform_policies":["Policy 1","Policy 2","Policy 3"],"forbidden_claims":["Claim 1","Claim 2","Claim 3","Claim 4"]}
}

NOTE: Visual data (colors/fonts/logo) will be added from scraped data, so you can skip the visual section or keep it minimal.`;

  try {
    console.log('🤖 Calling OpenAI with enhanced prompt...');
    console.log(`📝 Prompt length: ${prompt.length} characters`);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an elite brand strategist. 

CRITICAL JSON FORMATTING RULES:
- Output ONLY valid JSON (no markdown, no code blocks)
- Escape ALL quotes in text using backslash: Use \\" not "
- NO line breaks in strings - use spaces instead
- Write detailed, comprehensive content (3-5 sentences per field)
- Arrays should have 5-7 items each
- Be specific to this brand - no generic content
- NO placeholders like "Define your X"

Example valid JSON string: "This is a \\"quoted\\" word and a detailed explanation."
`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 4095
    });

    const result = completion.choices[0].message.content;
    if (!result) {
      console.error('❌ No content in AI response');
      throw new Error('No content in AI response');
    }

    console.log(`📊 AI response length: ${result.length} characters`);
    console.log('🔍 Parsing JSON response...');
    
    const enhancedIdentity = JSON.parse(result) as EnhancedBrandIdentity;
    
    // Validate that we got real content, not placeholders
    const hasRealContent = enhancedIdentity.dna?.mission && 
                          !enhancedIdentity.dna.mission.toLowerCase().includes('define your') &&
                          enhancedIdentity.dna.mission.length > 20;
    
    if (!hasRealContent) {
      console.warn('⚠️ AI returned placeholder content, using fallback with scraped data');
      return getFallbackIdentity(rawData);
    }
    
    console.log('✅ AI enhancement complete with real content');
    return enhancedIdentity;

  } catch (error: any) {
    console.error('❌ AI enhancement error:', error);
    console.error('Error details:', error.message);
    
    // Return a structure with scraped data
    console.log('🔄 Falling back to scraped data structure');
    return getFallbackIdentity(rawData);
  }
}

/**
 * Fallback identity if AI fails
 */
function getFallbackIdentity(rawData: WebsiteAnalysisResult): EnhancedBrandIdentity {
  return {
    dna: {
      name: rawData.content.title || 'Your Brand Name',
      problem_solved: 'Define the core problem you solve',
      origin_story: 'Share your brand story',
      mission: rawData.content.tagline || 'Define your mission',
      vision: 'Define your vision',
      world_problem: 'Define the problem you solve',
      emotional_outcome: 'Define the emotional outcome',
      differentiator: 'What makes you unique',
      anti_identity: 'What you never want to be',
      values: ['Value 1', 'Value 2', 'Value 3'],
      ethical_boundaries: ['Boundary 1', 'Boundary 2'],
      standards: ['Standard 1', 'Standard 2'],
      ten_year_identity: 'Define your 10-year identity'
    },
    product: {
      name: 'Your top product',
      category: 'Product category',
      main_benefits: 'Key benefits your product provides',
      unique_features: 'Unique features or ingredients',
      quality_level: 'Quality positioning',
      price_point: 'Price positioning',
      why_choose_us: 'Why customers should choose you'
    },
    audience: {
      ideal_customer: 'Description of your ideal customer',
      pain_points: 'Customer pain points',
      desires: 'Customer desires',
      fears: 'Customer fears and frustrations',
      shopping_behavior: 'How they shop',
      influences: 'What influences their decisions'
    },
    positioning: {
      market_category: 'Your market category',
      sub_category: 'Your sub-category',
      target_audience: 'Your target audience',
      not_for: ['Not for X', 'Not for Y'],
      remembered_for: 'What you want to be known for',
      dominant_idea: 'Your dominant brand idea'
    },
    market: {
      competitors: 'List your main competitors',
      positioning: 'How you position vs competitors',
      market_gap: 'Market opportunity you see'
    },
    offer: {
      price_strategy: 'Your pricing strategy',
      bundles: 'Bundle offerings',
      subscriptions: 'Subscription options'
    },
    journey: {
      discovery: 'How customers discover you',
      hesitation: 'Where customers hesitate',
      after_purchase: 'Post-purchase experience'
    },
    narrative: {
      hero: 'Your customer (the hero of the story)',
      villain: 'The problem they face',
      guide: 'Your brand (the guide helping them)',
      transformation: 'How they transform',
      outcome: 'The successful outcome'
    },
    pain_matrix: {
      physical_problems: 'Physical problems they experience',
      emotional_problems: 'Emotional struggles',
      social_problems: 'Social challenges',
      financial_problems: 'Financial concerns',
      identity_problems: 'Identity conflicts'
    },
    content_pillars: {
      pillar_1: 'Content Pillar 1: Define theme and purpose',
      pillar_2: 'Content Pillar 2: Define theme and purpose',
      pillar_3: 'Content Pillar 3: Define theme and purpose',
      pillar_4: 'Content Pillar 4: Optional'
    },
    trust_infrastructure: {
      social_proof_types: ['Customer testimonials', 'Case studies', 'User reviews'],
      certifications: ['List relevant certifications'],
      partnerships: ['Strategic partnerships'],
      media_mentions: ['Media features'],
      guarantees: ['Money-back guarantee', 'Quality guarantee']
    },
    community_model: {
      customer_treatment_philosophy: 'How you treat customers',
      problem_resolution_protocol: 'How you resolve issues',
      loyalty_building_tactics: 'How you build loyalty',
      community_building_strategy: 'Community building approach'
    },
    platform_strategy: {
      primary_platforms: 'Instagram, Facebook, Email, etc.',
      platform_tone_adjustments: 'Platform-specific tone variations',
      content_types_per_platform: 'Content types per platform'
    },
    long_term_vision: {
      future_products: 'Future product roadmap',
      future_markets: 'Markets to expand into',
      future_positioning: 'Evolution of positioning',
      brand_evolution_path: '3-5 year brand evolution'
    },
    kpis_optimization: {
      success_metrics: ['Revenue growth', 'Customer acquisition', 'Retention rate'],
      benchmarks: 'Industry benchmarks and targets',
      growth_targets: 'Specific growth goals'
    },
    ai_autonomy_rules: {
      can_decide_alone: ['Content topics', 'Tone adjustments', 'Image selection'],
      requires_approval: ['New campaigns', 'Brand changes', 'Major announcements'],
      forbidden_actions: ['Medical claims', 'Competitor attacks', 'Unsubstantiated claims'],
      escalation_logic: 'When to escalate to human review'
    },
    visual: {
      colors: {
        primary: rawData.visuals.colors.slice(0, 5).map((c, i) => ({
          hex: c.hex,
          name: `Primary Color ${i + 1}`,
          psychology: `Color used in ${c.context.join(', ')} (found ${c.frequency} times)`,
          usage: c.context.join(', ')
        })),
        secondary: rawData.visuals.colors.slice(5, 8).map((c, i) => ({
          hex: c.hex,
          name: `Secondary Color ${i + 1}`,
          psychology: `Color used in ${c.context.join(', ')} (found ${c.frequency} times)`,
          usage: c.context.join(', ')
        })),
        accent: rawData.visuals.colors.slice(8, 10).map((c, i) => ({
          hex: c.hex,
          name: `Accent Color ${i + 1}`,
          psychology: `Color used in ${c.context.join(', ')} (found ${c.frequency} times)`,
          usage: c.context.join(', ')
        }))
      },
      typography: {
        headings: rawData.visuals.fonts.length > 0
          ? rawData.visuals.fonts
              .filter(f => f.category === 'heading')
              .slice(0, 1)
              .map(f => ({
                family: f.family,
                personality: 'Define font personality',
                usage: f.usage.join(', ')
              }))
          : rawData.visuals.fonts.slice(0, 1).map(f => ({
              family: f.family,
              personality: 'Heading font',
              usage: 'H1, H2, titles'
            })),
        body: rawData.visuals.fonts.length > 0
          ? rawData.visuals.fonts
              .filter(f => f.category === 'body')
              .slice(0, 1)
              .map(f => ({
                family: f.family,
                personality: 'Define font personality',
                usage: f.usage.join(', ')
              }))
          : rawData.visuals.fonts.slice(1, 2).map(f => ({
              family: f.family,
              personality: 'Body font',
              usage: 'Paragraphs, body text'
            })),
        display: []
      },
      logo: {
        url: rawData.visuals.logo.url,
        description: 'Logo extracted from website'
      },
      image_style: 'Define your image style',
      mood: rawData.tone.formalityLevel
    },
    voice: {
      personality_traits: ['Trait 1', 'Trait 2', 'Trait 3'],
      vocabulary_style: rawData.tone.languageStyle,
      humor_level: 'subtle',
      authority_level: 'guide',
      emotional_range: 'Define emotional range',
      words_to_use: rawData.content.keywords.slice(0, 5),
      words_to_avoid: ['Avoid 1', 'Avoid 2'],
      on_brand_phrases: rawData.tone.examplePhrases.slice(0, 3),
      forbidden_phrases: ['Forbidden 1', 'Forbidden 2']
    },
    guardrails: {
      regulatory_limits: ['Define regulatory limits'],
      cultural_sensitivities: ['Define cultural sensitivities'],
      platform_policies: ['Define platform policies'],
      forbidden_claims: ['Define forbidden claims']
    }
  };
}

