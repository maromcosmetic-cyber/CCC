/**
 * Scene Planning Service
 * 
 * Uses playbook, persona, and audience data to generate scene descriptions
 * for product image generation aligned with brand identity
 */

import { BrandIdentityPlaybook, PersonaProfile, AudienceSegment, ScenePlanningResult } from '@/types/models';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { formatPlaybookAsText, extractVisualIdentity, extractBrandVoice } from './playbook-reader';
import { formatPersonaForPrompt, formatAudienceForPrompt } from './persona-context';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

/**
 * Plan scene for product-only images
 */
export async function planProductOnlyScene(
  playbook: BrandIdentityPlaybook,
  audience: AudienceSegment, // Added audience
  productInfo: { name: string; description?: string; category?: string },
  campaignContext?: { angle?: string; funnel_stage?: string }
): Promise<ScenePlanningResult> {
  const visualIdentity = extractVisualIdentity(playbook);
  const brandVoice = extractBrandVoice(playbook);

  const playbookText = formatPlaybookAsText(playbook);
  const audienceText = formatAudienceForPrompt(audience); // Format audience

  const prompt = `You are a professional commercial photographer and creative director.
Your task is to design a scene description for product photography that aligns with the brand identity and appeals to the target audience.

BRAND IDENTITY PLAYBOOK:
${playbookText}

TARGET AUDIENCE:
${audienceText}

PRODUCT INFORMATION:
Name: ${productInfo.name}
${productInfo.description ? `Description: ${productInfo.description}\n` : ''}
${productInfo.category ? `Category: ${productInfo.category}\n` : ''}

VISUAL IDENTITY:
Colors: ${visualIdentity.colors.join(', ') || 'Not specified'}
Mood: ${visualIdentity.mood || 'Not specified'}
Image Style: ${visualIdentity.imageStyle || 'Not specified'}
Aesthetic: ${visualIdentity.aesthetic || 'Not specified'}

${campaignContext?.angle ? `Campaign Angle: ${campaignContext.angle}\n` : ''}
${campaignContext?.funnel_stage ? `Funnel Stage: ${campaignContext.funnel_stage}\n` : ''}

Create a detailed scene description of the BACKGROUND AND SETTING ONLY.
The goal is to generate a **CINEMATIC, HIGH-END COMMERCIAL BACKGROUND**.
Do NOT mention the product itself in the scene description.

**CRITICAL: PRODUCT CONTEXT & AUDIENCE ALIGNMENT**
1. **Determine the Natural Setting**: Analyze the Product Name/Description/Category. Where does this product belong?
   - Example: Shampoo -> Luxury Shower Niche or Marble Bathroom Counter.
   - Example: Coffee -> Sunlit Cafe Table or Cozy Kitchen.
   - Example: Serum -> Vanity Table or Spa setting.
   - Example: Yoga Mat -> Serene Studio or Outdoor Nature.
   *The scene MUST be the natural application environment for this specific product.*

2. **Style it for the Audience**: The background must visually scream "${audience.name}".
   - "Luxury" -> Marble, Gold, Velvet, dark moody lighting.
   - "Gen Z" -> Neon, Concrete, Holographic, vibrant lighting.
   - "Eco" -> Raw wood, living plants, sunlight, stone.

**Merge these two:** "A [Audience Style] version of a [Product Setting]."

**CINEMATIC INSTRUCTIONS:**
- Lighting: use cinematic techniques (Rim lighting, Volumetric shafts of light, Gobo patterns, Dramatic contrast).
- Camera: Description must imply shallow depth of field (Bokeh), tight framing, and high-end lens quality.
- Atmosphere: Add atmospheric depth (dust particles, soft fog, warmth/coolness).

Describe the:
1. Surface (Material/Texture matching audience)
2. Background (Blurred, atmospheric, suggestive of location)
3. Cinematic Lighting (Direction, Color, Mood)

The description should be like: "A textured slate surface illuminated by a dramatic shaft of cool moonlight, with deep blue cinematic shadows and a soft bokeh city backdrop."

Return a JSON object with:
{
  "scene_description": "Detailed description of the CINEMATIC background (NO PRODUCT mentions)",
  "mood": "The emotional mood of the scene",
  "lighting": "Description of lighting setup",
  "color_harmony": ["color1", "color2", ...],
  "composition_notes": "Notes on composition and framing",
  "style_guidelines": ["guideline1", "guideline2", ...]
}`;

  try {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const scenePlan = JSON.parse(jsonMatch[0]);
      return scenePlan as ScenePlanningResult;
    }

    // Fallback if JSON parsing fails
    return {
      scene_description: text.substring(0, 500),
      mood: visualIdentity.mood || 'professional',
      lighting: 'professional studio lighting',
      color_harmony: visualIdentity.colors.slice(0, 3),
      composition_notes: 'Focus on product presentation',
      style_guidelines: ['Professional', 'Commercial quality'],
    };
  } catch (error: any) {
    console.error('Scene planning error:', error);
    // Return fallback scene plan
    return {
      scene_description: `Professional product photography scene with ${visualIdentity.aesthetic || 'clean'} aesthetic, ${visualIdentity.mood || 'professional'} mood, featuring ${productInfo.name}`,
      mood: visualIdentity.mood || 'professional',
      lighting: 'professional studio lighting',
      color_harmony: visualIdentity.colors.slice(0, 3) || ['#FFFFFF'],
      composition_notes: 'Focus on product presentation',
      style_guidelines: ['Professional', 'Commercial quality'],
    };
  }
}

/**
 * Plan scene for product+persona images
 * Enhanced to include persona attire adaptation and product placement guidance
 */
export async function planProductPersonaScene(
  playbook: BrandIdentityPlaybook,
  persona: PersonaProfile,
  audience: AudienceSegment,
  productInfo: { name: string; description?: string },
  campaignContext?: { angle?: string; funnel_stage?: string }
): Promise<ScenePlanningResult> {
  const visualIdentity = extractVisualIdentity(playbook);
  const brandVoice = extractBrandVoice(playbook);

  const playbookText = formatPlaybookAsText(playbook);
  const personaText = formatPersonaForPrompt(persona);
  const audienceText = formatAudienceForPrompt(audience);

  const prompt = `You are a professional commercial photographer, casting director, and creative director.
Your task is to design a complete scene description for product photography featuring a persona using the product.

BRAND IDENTITY PLAYBOOK:
${playbookText}

${personaText}

${audienceText}

PRODUCT INFORMATION:
Name: ${productInfo.name}
${productInfo.description ? `Description: ${productInfo.description}\n` : ''}

VISUAL IDENTITY:
Colors: ${visualIdentity.colors.join(', ') || 'Not specified'}
Mood: ${visualIdentity.mood || 'Not specified'}
Image Style: ${visualIdentity.imageStyle || 'Not specified'}
Aesthetic: ${visualIdentity.aesthetic || 'Not specified'}

${campaignContext?.angle ? `Campaign Angle: ${campaignContext.angle}\n` : ''}
${campaignContext?.funnel_stage ? `Funnel Stage: ${campaignContext.funnel_stage}\n` : ''}

CRITICAL REQUIREMENTS:
1. **SCENE CONTEXT**: Determine the most appropriate scene for THIS SPECIFIC PRODUCT:
   - Hair products (shampoo, conditioner, hair mask) → Shower/bathroom with water
   - Skincare (face cream, serum, moisturizer) → Bathroom vanity/mirror
   - Body care (body lotion, shower gel) → Bathroom or spa setting
   - Drinks/beverages → Kitchen, living room, or outdoor
   - Other → Appropriate lifestyle setting

2. **PERSONA ATTIRE ADAPTATION** (CRITICAL):
   The persona's CLOTHES MUST MATCH THE SCENE, not their reference image clothing.
   - Shower scene → Towel wrap, bare shoulders, wet hair look
   - Bathroom vanity → Silk robe, comfortable home attire, hair may be up
   - Living room → Casual elegant home clothes
   - Kitchen → Casual comfortable clothes
   - Outdoor → Scene-appropriate outdoor wear
   
4. **PRODUCT ACTION**: How should the persona USE/INTERACT with the product?
   - Shampoo/Conditioner → Pouring into palm, massaging into hair, lathering
   - Face cream/serum → Applying to face, dabbing on cheeks, patting onto skin
   - Body lotion → Smoothing onto arms/legs, rubbing into skin
   - Drinks → Holding glass, sipping, pouring

Return a JSON object with ALL of these fields:
{
  "scene_description": "Detailed description of the scene with persona and product, lighting, composition, background",
  "mood": "The emotional mood of the scene",
  "lighting": "Description of lighting setup",
  "color_harmony": ["color1", "color2", ...],
  "composition_notes": "Notes on composition, persona positioning, product placement",
  "style_guidelines": ["guideline1", "guideline2", ...],
  "scene_type": "shower" | "bathroom" | "living_room" | "kitchen" | "outdoor" | "studio" | "other",
  "persona_attire_adaptation": "SPECIFIC clothing/attire instructions for this scene",
  "product_placement_zone": "left" | "right" | "center" | "bottom-left" | "bottom-right",
  "product_scale_hint": "small" | "medium" | "large",
  "product_action": "SPECIFIC action describing how persona uses/holds/interacts with the product (e.g., 'pouring shampoo into open palm', 'gently applying cream to cheek with fingertips')"
}`;

  try {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const scenePlan = JSON.parse(jsonMatch[0]);
      return scenePlan as ScenePlanningResult;
    }

    // Fallback with enhanced defaults
    return buildFallbackScenePlan(persona, productInfo, visualIdentity);
  } catch (error: any) {
    console.error('Scene planning error:', error);
    return buildFallbackScenePlan(persona, productInfo, visualIdentity);
  }
}

/**
 * Build fallback scene plan with intelligent defaults based on product name
 */
function buildFallbackScenePlan(
  persona: PersonaProfile,
  productInfo: { name: string; description?: string },
  visualIdentity: { colors: string[]; mood?: string; aesthetic?: string }
): ScenePlanningResult {
  const productText = (productInfo.name + ' ' + (productInfo.description || '')).toLowerCase();

  // Determine scene type based on product
  const hairKeywords = ['shampoo', 'conditioner', 'hair', 'scalp', 'wash', 'rinse'];
  const skincareKeywords = ['serum', 'cream', 'moisturizer', 'face', 'skin', 'lotion', 'mask'];
  const bodyKeywords = ['body', 'shower gel', 'soap', 'bath'];

  let sceneType: ScenePlanningResult['scene_type'] = 'studio';
  let attire = 'casual elegant clothing';
  let placement: ScenePlanningResult['product_placement_zone'] = 'left';

  if (hairKeywords.some(k => productText.includes(k))) {
    sceneType = 'shower';
    attire = 'white towel wrap around body, bare shoulders visible, hair damp and naturally tousled';
    placement = 'left';
  } else if (skincareKeywords.some(k => productText.includes(k))) {
    sceneType = 'bathroom';
    attire = 'silk or satin robe in neutral color, hair pulled back or up, minimal makeup look';
    placement = 'left';
  } else if (bodyKeywords.some(k => productText.includes(k))) {
    sceneType = 'bathroom';
    attire = 'plush bathrobe or towel, relaxed spa-like appearance';
    placement = 'right';
  }

  // Generate product action based on product type
  let productAction = 'holding the product beautifully';
  if (hairKeywords.some(k => productText.includes(k))) {
    productAction = `pouring ${productInfo.name} from bottle into open palm, ready to apply to hair`;
  } else if (skincareKeywords.some(k => productText.includes(k))) {
    productAction = `gently applying ${productInfo.name} to face with fingertips, dabbing onto cheek`;
  } else if (bodyKeywords.some(k => productText.includes(k))) {
    productAction = `smoothing ${productInfo.name} onto arm with long graceful stroke`;
  }

  return {
    scene_description: `Professional scene with persona (${persona.name}) in a ${sceneType} setting actively using ${productInfo.name}, ${visualIdentity.aesthetic || 'natural'} aesthetic, ${visualIdentity.mood || 'authentic'} mood`,
    mood: visualIdentity.mood || 'authentic',
    lighting: sceneType === 'shower' ? 'soft natural light through frosted glass, steam atmosphere' : 'natural lighting',
    color_harmony: visualIdentity.colors.slice(0, 3) || ['#FFFFFF'],
    composition_notes: `Persona actively using the product, natural interaction`,
    style_guidelines: ['Natural', 'Professional', 'Authentic', 'Lifestyle'],
    scene_type: sceneType,
    persona_attire_adaptation: attire,
    product_placement_zone: placement,
    product_scale_hint: 'medium',
    product_action: productAction
  };
}

/**
 * Plan scene for UGC style images
 */
export async function planUGCStyleScene(
  playbook: BrandIdentityPlaybook,
  persona: PersonaProfile,
  audience: AudienceSegment,
  productInfo: { name: string; description?: string },
  campaignContext?: { angle?: string }
): Promise<ScenePlanningResult> {
  const visualIdentity = extractVisualIdentity(playbook);
  const brandVoice = extractBrandVoice(playbook);

  const playbookText = formatPlaybookAsText(playbook);
  const personaText = formatPersonaForPrompt(persona);
  const audienceText = formatAudienceForPrompt(audience);

  const prompt = `You are a professional creative director specializing in User-Generated Content (UGC) style photography.
Your task is to design a scene description for UGC-style product photography.

BRAND IDENTITY PLAYBOOK:
${playbookText}

${personaText}

${audienceText}

PRODUCT INFORMATION:
Name: ${productInfo.name}
${productInfo.description ? `Description: ${productInfo.description}\n` : ''}

VISUAL IDENTITY:
Colors: ${visualIdentity.colors.join(', ') || 'Not specified'}
Mood: ${visualIdentity.mood || 'Not specified'}
Aesthetic: ${visualIdentity.aesthetic || 'Not specified'}

${campaignContext?.angle ? `Campaign Angle: ${campaignContext.angle}\n` : ''}

Create a detailed scene description for UGC-STYLE photography.
The persona should be talking to the camera (eye contact) while holding the product.
The scene should:
1. Look authentic and candid (not overly polished)
2. Use natural lighting (like smartphone camera)
3. Show persona talking directly to camera
4. Product should be visible and held naturally
5. Match persona's style and brand aesthetic
6. Be realistic and unpolished (UGC aesthetic)

Return a JSON object with:
{
  "scene_description": "Detailed description of UGC-style scene, natural setting, persona talking to camera, product visible",
  "mood": "The emotional mood (should be authentic/candid)",
  "lighting": "Natural lighting description (smartphone camera aesthetic)",
  "color_harmony": ["color1", "color2", ...],
  "composition_notes": "Notes on UGC-style composition, eye contact, product placement",
  "style_guidelines": ["guideline1", "guideline2", ...]
}`;

  try {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const scenePlan = JSON.parse(jsonMatch[0]);
      return scenePlan as ScenePlanningResult;
    }

    // Fallback
    return {
      scene_description: `Authentic UGC-style scene with persona (${persona.name}) talking directly to camera, holding ${productInfo.name}, natural setting, smartphone camera aesthetic`,
      mood: 'authentic',
      lighting: 'natural lighting, smartphone camera aesthetic',
      color_harmony: visualIdentity.colors.slice(0, 3) || ['#FFFFFF'],
      composition_notes: `Persona making eye contact with camera, product held naturally, unpolished authentic look`,
      style_guidelines: ['Authentic', 'Candid', 'UGC style', 'Natural'],
    };
  } catch (error: any) {
    console.error('UGC scene planning error:', error);
    return {
      scene_description: `Authentic UGC-style scene with persona talking to camera, holding ${productInfo.name}`,
      mood: 'authentic',
      lighting: 'natural lighting',
      color_harmony: visualIdentity.colors.slice(0, 3) || ['#FFFFFF'],
      composition_notes: `Persona talking to camera, product visible`,
      style_guidelines: ['Authentic', 'UGC style'],
    };
  }
}
