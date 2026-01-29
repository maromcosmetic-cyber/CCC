/**
 * Ad Generator
 * 
 * Executes templates to create final ads.
 * AI generates copy, but layout is strictly template-driven.
 * This ensures ads follow proven structures while maintaining brand consistency.
 */

import OpenAI from 'openai';
import { AdTemplate, GeneratedAd, AudienceSegment, Product, AdCreativeStrategy, ImageLayoutMap } from '@/types/models';
import { createServiceRoleClient } from '@/lib/auth/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate an ad from a template
 */
export async function generateAdFromTemplate(
  template: AdTemplate,
  audience: AudienceSegment,
  product: Product | null,
  campaignImageUrl: string | null,
  strategy: AdCreativeStrategy | null, // New input
  visualAnalysis: ImageLayoutMap | null, // New input
  providedHeadline?: string | null,
  providedBodyCopy?: string | null,
  providedHook?: string | null,
  providedCta?: string | null
): Promise<Omit<GeneratedAd, 'id' | 'created_at' | 'updated_at'>> {
  // Step 1: Get brand identity for copy generation
  const supabase = createServiceRoleClient();
  const { data: project } = await (supabase as any)
    .from('projects')
    .select('brand_identity')
    .eq('id', template.project_id)
    .single();

  if (!project) {
    throw new Error('Project not found');
  }

  const brandIdentity = (project as any).brand_identity || {};

  // Step 2: Generate ad copy using AI (respecting template text zones)
  const adCopy = providedHeadline && providedBodyCopy && providedCta && providedHook
    ? {
      headline: providedHeadline,
      body_copy: providedBodyCopy,
      hook: providedHook,
      cta: providedCta
    }
    : await generateAdCopy(
      template,
      audience,
      product,
      brandIdentity,
      strategy,
      visualAnalysis,
      providedHeadline,
      providedBodyCopy,
      providedHook,
      providedCta
    );

  // Step 3: Select or use provided campaign image (Logic moved to worker mostly, but strict check here)
  const imageUrl = campaignImageUrl || await selectCampaignImage(
    template.project_id,
    audience.id,
    product?.id || null
  );

  // Step 4: Build ad assets following template structure
  const assets = {
    image_url: imageUrl as string,
    headline: adCopy.headline,
    body_copy: adCopy.body_copy,
    hook: adCopy.hook,
    cta: adCopy.cta,
    ...(template.template_type === 'carousel' ? { additional_images: [] } : {})
  };

  // Step 5: Build metadata
  const metadata = {
    platform: template.platform,
    dimensions: template.layout_json.image_zones[0]?.dimensions || '1200x628',
    file_format: 'jpg',
    aspect_ratio: template.layout_json.image_zones[0]?.aspect_ratio || '16:9',
    strategy: strategy || undefined,
    image_analysis: visualAnalysis || undefined
  };

  return {
    project_id: template.project_id,
    template_id: template.id,
    audience_segment_id: audience.id,
    product_id: product?.id || null,
    ad_type: template.template_type === 'static_image' ? 'image' :
      template.template_type === 'carousel' ? 'carousel' : 'video',
    assets_json: assets,
    metadata_json: metadata,
    status: 'draft'
  };
}

/**
 * Generate ad copy using AI (respecting template constraints)
 */
async function generateAdCopy(
  template: AdTemplate,
  audience: AudienceSegment,
  product: Product | null,
  brandIdentity: any,
  strategy: AdCreativeStrategy | null,
  visualAnalysis: ImageLayoutMap | null,
  providedHeadline?: string | null,
  providedBodyCopy?: string | null,
  providedHook?: string | null,
  providedCta?: string | null
): Promise<{ headline: string; body_copy: string; hook: string; cta: string }> {
  // Get text zone constraints from template
  const headlineZone = template.layout_json.text_zones.find(z => z.type === 'headline');
  const bodyZone = template.layout_json.text_zones.find(z => z.type === 'body');
  const hookZone = template.layout_json.text_zones.find(z => z.type === 'hook'); // Might be missing in old templates
  const ctaZone = template.layout_json.text_zones.find(z => z.type === 'cta');

  const headlineMaxChars = headlineZone?.max_chars || 40;
  const bodyMaxChars = bodyZone?.max_chars || 125;
  const hookMaxChars = hookZone?.max_chars || 50;
  const ctaMaxChars = ctaZone?.max_chars || 20;

  // Build context for copy generation
  const audienceContext = {
    name: audience.name,
    description: audience.description,
    pain_points: audience.pain_points || [],
    desires: audience.desires || []
  };

  const productContext = product ? {
    name: product.name,
    description: product.description,
    price: product.price,
    currency: product.currency
  } : null;

  // Extract specific brand identity elements
  const brandVoice = brandIdentity.voice || {};
  const brandGuardrails = brandIdentity.guardrails || {};
  const brandPositioning = brandIdentity.positioning || {};

  // Incorporate Strategy into Prompt
  const strategyContext = strategy ? `
    Angle: ${strategy.angle}
    Emotional Tone: ${strategy.emotional_tone}
    Message Density: ${strategy.message_density}
    Risk Level: ${strategy.risk_level}
    Strategy Rationale: ${strategy.rationale}
  ` : 'No specific strategy provided - optimize for click-through.';

  const visualContext = visualAnalysis ? `
    Visual Context:
    - Dominant Colors: ${visualAnalysis.dominant_colors.join(', ')}
    - Contrast: ${visualAnalysis.contrast_level}
    - Suggestion: ${visualAnalysis.suggested_text_color ? 'Use ' + visualAnalysis.suggested_text_color + ' text' : 'Ensure high contrast'}
  ` : '';

  const prompt = `
You are CCC Copyright Engine, an expert-level e-commerce conversion copywriter + strategist, embedded inside Commerce Command Center (CCC).

Your job is to generate high-performing, platform-native marketing copy for e-commerce brands using brand identity, product data, competitor intelligence, and campaign context provided by CCC.

You do not produce generic AI copy.
Every output must be conversion-focused, brand-aligned, and platform-optimized.

⸻

TARGET PLATFORM: ${template.platform}
TEMPLATE TYPE: ${template.template_type}

⸻

CONTEXT SOURCES (MANDATORY):

1. BRAND IDENTITY:
- Voice & Tone: ${brandVoice.tone_adjectives?.join(', ') || 'Professional'}
- Archetype: ${brandVoice.archetype || 'Not specified'}
- Mission/Positioning: ${brandPositioning.mission_statement || brandPositioning.tagline || 'Not specified'}
- Forbidden Words: ${brandGuardrails.forbidden_words?.join(', ') || 'None'}
- Approved Phrases: ${brandGuardrails.approved_phrases?.join(', ') || 'None'}

2. PRODUCT DATA:
${productContext ? JSON.stringify(productContext, null, 2) : 'No specific product - general brand ad'}

3. AUDIENCE PROFILE:
${JSON.stringify(audienceContext, null, 2)}

4. STRATEGY & VISUALS:
${strategyContext}
${visualContext}

⸻

OUTPUT RULES (CRITICAL):

For this request:
1. Platform-native
   - Respect character limits EXACTLY
   - Match platform behavior (e.g. ${template.platform} user expectations)
2. Conversion-first
   - Clear hook
   - Value articulation
   - Objection handling (explicit or implicit)
   - Strong CTA
3. Brand-aligned
   - Never break brand rules
   - Never invent claims
   - Never use restricted language
4. Non-generic
   - Avoid vague hype
   - Avoid filler adjectives
   - Avoid "AI-sounding" phrasing

⸻

YOUR TASK:

Fill the following text zones based on the template constraints:

1. **Hook** (max ${hookMaxChars} chars):
   - ${hookZone ? 'Required' : 'Optional/Internal use'}
   - Stops the scroll
   - ${strategy ? 'Aligns with ' + strategy.angle : 'Grabs attention'}
   
2. **Headline** (max ${headlineMaxChars} chars): 
   - Clear benefit or promise
   - ${strategy?.emotional_tone ? 'Tone: ' + strategy.emotional_tone : ''}
   - MUST be exactly ${headlineMaxChars} characters or less

3. **Body Copy** (max ${bodyMaxChars} chars):
   - Explains the value proposition
   - Connects to audience emotions
   - MUST be exactly ${bodyMaxChars} characters or less

4. **CTA** (max ${ctaMaxChars} chars):
   - Clear action verb
   - MUST be exactly ${ctaMaxChars} characters or less

CRITICAL: Return a VALID JSON object with NO extra text.
{
  "hook": "Your hook here",
  "headline": "Your headline here",
  "body_copy": "Your body copy here",
  "cta": "Your CTA here"
}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a professional ad copywriter. Always return valid JSON matching the requested structure.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content);

    // Validate character limits (substring to strict limit)
    const substring = (str: string, len: number) => str ? str.substring(0, len) : '';

    return {
      hook: substring(parsed.hook || providedHook || 'Stop Scrolling', hookMaxChars),
      headline: substring(parsed.headline || providedHeadline || 'Headline', headlineMaxChars),
      body_copy: substring(parsed.body_copy || providedBodyCopy || 'Body copy', bodyMaxChars),
      cta: substring(parsed.cta || providedCta || 'Learn More', ctaMaxChars)
    };
  } catch (error: any) {
    console.error('Ad copy generation failed:', error);
    // Fallback copy - use provided values if available
    return {
      hook: providedHook || 'Attention',
      headline: providedHeadline || (product ? `Discover ${product.name}` : 'Transform Your Life'),
      body_copy: providedBodyCopy || audience.description || 'Experience the difference',
      cta: providedCta || 'Get Started'
    };
  }
}

/**
 * Select a campaign image from generated images assigned to the persona
 * Each persona should have multiple images, so we randomly select one for variety
 */
async function selectCampaignImage(
  projectId: string,
  audienceId: string,
  productId: string | null
): Promise<string> {
  const supabase = createServiceRoleClient();

  // Step 1: Get the audience segment to find the persona name
  const { data: audience, error: audienceError } = await supabase
    .from('audience_segments')
    .select('name')
    .eq('id', audienceId)
    .eq('id', audienceId)
    .eq('project_id', projectId)
    .single();

  if (audienceError || !audience) {
    console.error('Failed to fetch audience for image selection:', audienceError);
  }

  const personaName = (audience as any)?.name;

  // Step 2: Query images assigned to this persona/audience
  // Priority order:
  // 1. Images with persona_name AND product_id (if product selected)
  // 2. Images with persona_name only
  // 3. Images with audience_id only (fallback)

  let assets: any[] = [];

  // Priority 1: Persona + Product (if product is selected)
  if (productId && personaName) {
    const { data: productPersonaAssets } = await supabase
      .from('media_assets')
      .select('storage_url, id')
      .eq('project_id', projectId)
      .eq('audience_id', audienceId)
      .eq('persona_name', personaName)
      .contains('product_ids', [productId])
      .not('storage_url', 'is', null);

    if (productPersonaAssets && productPersonaAssets.length > 0) {
      assets = productPersonaAssets;
      console.log(`✅ Found ${assets.length} images for persona "${personaName}" with product ${productId}`);
    }
  }

  // Priority 2: Persona only (no product filter)
  if (assets.length === 0 && personaName) {
    const { data: personaAssets } = await supabase
      .from('media_assets')
      .select('storage_url, id')
      .eq('project_id', projectId)
      .eq('audience_id', audienceId)
      .eq('persona_name', personaName)
      .not('storage_url', 'is', null);

    if (personaAssets && personaAssets.length > 0) {
      assets = personaAssets;
      console.log(`✅ Found ${assets.length} images for persona "${personaName}" (no product filter)`);
    }
  }

  // Priority 3: Audience only (fallback - no persona name match)
  if (assets.length === 0) {
    let query = supabase
      .from('media_assets')
      .select('storage_url, id')
      .eq('project_id', projectId)
      .eq('audience_id', audienceId)
      .not('storage_url', 'is', null);

    if (productId) {
      query = query.contains('product_ids', [productId]);
    }

    const { data: audienceAssets } = await query;

    if (audienceAssets && audienceAssets.length > 0) {
      assets = audienceAssets;
      console.log(`⚠️ Found ${assets.length} images for audience (no persona match)`);
    }
  }

  // Step 3: Randomly select from available images for variety
  if (assets.length > 0) {
    const randomIndex = Math.floor(Math.random() * assets.length);
    const selectedImage = assets[randomIndex];

    if (selectedImage?.storage_url) {
      console.log(`📸 Selected image ${randomIndex + 1} of ${assets.length} for persona "${personaName || 'unknown'}"`);
      return selectedImage.storage_url;
    }
  }

  // Final fallback: no images found
  throw new Error(
    `No campaign images found for this persona/audience. ` +
    `Please generate images first in the Images tab for the selected audience "${personaName || audienceId}".`
  );
}
