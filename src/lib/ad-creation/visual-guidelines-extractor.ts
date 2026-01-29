/**
 * Visual Guidelines Extractor
 * 
 * Analyzes competitor ads to extract structural visual patterns that prove performance.
 * Combines market intelligence with brand identity to create aligned visual guidelines.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServiceRoleClient } from '@/lib/auth/server';
import { VisualGuideline } from '@/types/models';

export interface CompetitorAdData {
  competitor_name: string;
  ads: Array<{
    ad_creative_body?: string;
    ad_creative_link_title?: string;
    platform: string;
    ad_delivery_start_time?: string;
    ad_snapshot_url?: string;
    longevity_days?: number; // Calculated from start date
  }>;
  total_ads: number;
  platforms: string[];
  ad_frequency: string;
}

export interface BrandIdentityData {
  visual?: {
    colors?: {
      primary?: Array<{ hex: string; name?: string }>;
      secondary?: Array<{ hex: string; name?: string }>;
      accent?: Array<{ hex: string; name?: string }>;
    };
    typography?: Record<string, any>;
    image_style?: string;
    mood?: string;
  };
  voice?: Record<string, any>;
  positioning?: Record<string, any>;
  guardrails?: {
    visual_rules?: string[];
    forbidden_topics?: string[];
  };
}

/**
 * Extract visual guidelines from competitor ad data
 */
export async function extractVisualGuidelines(
  projectId: string,
  competitorAdData: CompetitorAdData[]
): Promise<Omit<VisualGuideline, 'id' | 'created_at' | 'updated_at'>> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  // Get brand identity for alignment
  const supabase = createServiceRoleClient();
  const { data: project } = await supabase
    .from('projects')
    .select('brand_identity')
    .eq('id', projectId)
    .single();

  if (!project) {
    throw new Error('Project not found');
  }

  const brandIdentity: BrandIdentityData = project.brand_identity || {};

  // Prepare competitor ad context
  const adsContext = competitorAdData.map(comp => ({
    competitor: comp.competitor_name,
    total_ads: comp.total_ads,
    platforms: comp.platforms,
    frequency: comp.ad_frequency,
    sample_ads: comp.ads.slice(0, 10).map(ad => ({
      body: ad.ad_creative_body || '',
      headline: ad.ad_creative_link_title || '',
      platform: ad.platform,
      longevity_days: ad.longevity_days || 0,
      snapshot_url: ad.ad_snapshot_url
    }))
  }));

  // Calculate category from project or infer from competitors
  const category = inferCategory(competitorAdData, brandIdentity);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

  const prompt = `
You are an expert visual strategist specializing in performance advertising.

Your task: Extract STRUCTURAL visual patterns from competitor ads that prove performance through longevity and repetition.

CRITICAL PRINCIPLE: You are NOT copying creative. You are extracting ABSTRACT structural signals that indicate what layouts, compositions, and visual hierarchies convert in this market.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPETITOR AD DATA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(adsContext, null, 2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BRAND IDENTITY (for alignment):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Colors: ${JSON.stringify(brandIdentity.visual?.colors || {})}
Image Style: ${brandIdentity.visual?.image_style || 'Not specified'}
Mood: ${brandIdentity.visual?.mood || 'Not specified'}
Visual Rules: ${JSON.stringify(brandIdentity.guardrails?.visual_rules || [])}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR ANALYSIS TASK:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **Image Placement Analysis**: 
   - Where do successful ads place the main image? (center, left, right)
   - Is there a dominant pattern across long-running ads?

2. **Text Hierarchy Analysis**:
   - What comes first: headline or supporting text?
   - How is text layered? (headline_first vs support_first)

3. **CTA Position Analysis**:
   - Where is the call-to-action placed? (bottom, center, overlay)
   - Is there a consistent pattern?

4. **Visual Density Analysis**:
   - Are successful ads minimal, moderate, or busy?
   - What level of visual complexity converts?

5. **Background Style Analysis**:
   - Clean backgrounds vs lifestyle scenes vs gradients?
   - What background style dominates in long-running ads?

6. **Color Analysis**:
   - What dominant colors appear in successful ads?
   - Extract color hex codes if identifiable

7. **Composition Rules**:
   - What composition patterns repeat across successful ads?
   - Rule of thirds? Centered? Asymmetric?

8. **Performance Signals**:
   - Calculate average longevity (days running) for ads
   - Identify platform coverage patterns
   - Calculate frequency score (how often pattern appears)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BRAND ALIGNMENT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After extracting market patterns, determine:

1. **Overrides**: Which brand rules MUST override market patterns?
   - Example: Brand requires clean backgrounds, but market uses lifestyle → Brand wins
   - Example: Brand colors must be used, not competitor colors

2. **Adaptations**: How can market patterns be adapted to brand?
   - Example: Market uses center placement → Brand uses center but with brand colors
   - Example: Market uses busy layouts → Brand adapts to minimal but keeps CTA position

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return a SINGLE valid JSON object matching this EXACT structure:

{
  "market_patterns": {
    "image_placement": "center" | "left" | "right",
    "text_hierarchy": "headline_first" | "support_first",
    "cta_position": "bottom" | "center" | "overlay",
    "visual_density": "minimal" | "moderate" | "busy",
    "background_style": "clean" | "lifestyle" | "gradient",
    "dominant_colors": ["#hex1", "#hex2", "#hex3"],
    "composition_rules": [
      "Rule 1: Product centered with negative space",
      "Rule 2: Text in upper third",
      "Rule 3: CTA at bottom with contrast"
    ]
  },
  "performance_signals": {
    "longevity_days": 45,
    "platform_coverage": ["facebook", "instagram"],
    "frequency_score": 8
  },
  "brand_alignment": {
    "overrides": {
      "background_style": "Brand requires clean backgrounds, overriding market lifestyle preference",
      "colors": "Brand colors (#brand1, #brand2) must be used instead of market colors"
    },
    "adaptations": {
      "image_placement": "Market uses center → Brand adapts center placement with brand styling",
      "cta_position": "Market uses bottom → Brand keeps bottom but uses brand color for CTA"
    }
  }
}

CRITICAL RULES:
- Base patterns on ACTUAL competitor ad data provided
- Longevity = indicator of performance (ads that run long = working)
- Frequency = how often pattern appears across competitors
- Brand rules ALWAYS override market when in conflict
- Adaptations show how to blend market patterns with brand identity
- Output ONLY valid JSON, no explanations
`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Clean JSON response
    let jsonString = response.replace(/```json\n?|\n?```/g, '').trim();
    const start = jsonString.indexOf('{');
    const end = jsonString.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      jsonString = jsonString.substring(start, end + 1);
    }

    const extracted = JSON.parse(jsonString);

    // Calculate actual performance signals from data
    const performanceSignals = calculatePerformanceSignals(competitorAdData);

    return {
      project_id: projectId,
      category,
      guideline_json: {
        market_patterns: extracted.market_patterns,
        performance_signals: {
          ...extracted.performance_signals,
          ...performanceSignals
        }
      },
      brand_alignment_json: extracted.brand_alignment
    };
  } catch (error: any) {
    console.error('Visual Guidelines Extraction Failed:', error);
    throw new Error(`Guidelines extraction failed: ${error.message}`);
  }
}

/**
 * Infer category from competitor data or brand identity
 */
function inferCategory(
  competitorAdData: CompetitorAdData[],
  brandIdentity: BrandIdentityData
): string {
  // Try to infer from brand identity first
  if (brandIdentity.positioning?.market_category) {
    return brandIdentity.positioning.market_category.toLowerCase();
  }

  // Infer from competitor names/ads (simple heuristic)
  const allText = competitorAdData
    .map(c => c.competitor_name + ' ' + c.ads.map(a => a.ad_creative_body || '').join(' '))
    .join(' ')
    .toLowerCase();

  // Common category keywords
  const categories = ['cosmetics', 'fitness', 'fashion', 'tech', 'food', 'health', 'beauty'];
  for (const cat of categories) {
    if (allText.includes(cat)) {
      return cat;
    }
  }

  return 'general';
}

/**
 * Calculate performance signals from actual competitor data
 */
function calculatePerformanceSignals(
  competitorAdData: CompetitorAdData[]
): {
  longevity_days: number;
  platform_coverage: string[];
  frequency_score: number;
} {
  const allPlatforms = new Set<string>();
  let totalLongevity = 0;
  let adCount = 0;

  competitorAdData.forEach(comp => {
    comp.platforms.forEach(p => allPlatforms.add(p));
    comp.ads.forEach(ad => {
      if (ad.longevity_days) {
        totalLongevity += ad.longevity_days;
        adCount++;
      }
    });
  });

  const avgLongevity = adCount > 0 ? Math.round(totalLongevity / adCount) : 0;

  // Frequency score: how many competitors show this pattern (1-10 scale)
  const frequencyScore = Math.min(10, competitorAdData.length * 2);

  return {
    longevity_days: avgLongevity,
    platform_coverage: Array.from(allPlatforms),
    frequency_score: frequencyScore
  };
}
