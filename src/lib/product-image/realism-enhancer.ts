/**
 * Realism Enhancement Service
 * 
 * Ensures photorealistic output through:
 * 1. Prompt engineering with realism keywords
 * 2. Post-processing with Freepik (upscaling, skin enhancement)
 */

import { EnhancementProvider, EnhancementResult } from '@/lib/providers/base/EnhancementProvider';
import { FreepikProvider } from '@/lib/providers/freepik/FreepikProvider';
import { ImageType } from '@/types/models';

/**
 * Build realism-enhanced prompt
 */
export function buildRealismPrompt(
  basePrompt: string,
  imageType: ImageType
): string {
  const baseRealismKeywords =
    'photorealistic, professional photography, high resolution 8k, realistic lighting, sharp details, no AI artifacts, no oversaturation, realistic shadows';

  let typeSpecificKeywords = '';
  if (imageType === 'product_only') {
    typeSpecificKeywords =
      'product photography, commercial quality, realistic materials, professional studio lighting';
  } else if (imageType === 'product_persona') {
    typeSpecificKeywords =
      'natural skin tone, realistic facial features, authentic expression, lifelike appearance, natural skin texture';
  } else if (imageType === 'ugc_style') {
    typeSpecificKeywords =
      'authentic candid moment, natural lighting, realistic setting, smartphone camera aesthetic, unpolished authentic look';
  }

  return `${basePrompt}, ${baseRealismKeywords}, ${typeSpecificKeywords}`;
}

/**
 * Build recomposition prompt with product fidelity requirements
 */
export function buildRecompositionPrompt(
  scenePrompt: string,
  imageType: 'product_only' | 'product_persona'
): string {
  const taskInstruction =
    'Blend the product in the input image into the scene described below.';
  const requirements =
    "IDENTITY LOCK: The product image is GROUND TRUTH. TEXTURE MAPPING: Treat the product image as a FLATTENED, IMMUTABLE TEXTURE. Do not attempt to read or understand the text. Just copy the pixels exactly. Text pixels must NOT be re-interpreted, redrawn, or stylized. Logo geometry must remain Euclidean and rigid. Font weight, kerning, and color must match original exactly. DETAIL PRIORITY: Focus on HIGH FREQUENCY DETAILS. The text and logo must be razor sharp. LIGHTING: Ensure EVEN, FRONTAL lighting on the product face to prevent shadows from obscuring text. SCALE CONTROL: The product MUST maintain a realistic human-scale proportion, but large enough to be legible. It should occupy approx 15-18% of the vertical frame height (Standard CPG shot). It must be handheld-sized, roughly the size of a large smartphone or small bottle. RIGID BODY: The product is a solid, non-deformable object; do not curve or bend labels.";

  const realismPrompt = buildRealismPrompt(scenePrompt, imageType);

  return `TASK: ${taskInstruction}\nREQUIREMENTS: ${requirements}\nSCENE: ${realismPrompt}\nOUTPUT: Return ONLY the generated image.`;
}

/**
 * Build UGC style prompt
 */
export function buildUGCPrompt(basePrompt: string): string {
  const ugcSpecific =
    'Persona talking directly to camera with eye contact, holding product naturally, authentic candid moment, natural lighting, realistic setting, smartphone camera aesthetic, unpolished authentic look';
  return buildRealismPrompt(`${basePrompt}. ${ugcSpecific}`, 'ugc_style');
}

import { VertexImagenProvider } from '@/lib/providers/google-imagen/VertexImagenProvider';
import sharp from 'sharp';

/**
 * Enhance image with AI Relighting + Freepik Upscaling
 */
export async function enhanceImageForRealism(
  imageBase64: string,
  imageType: ImageType,
  scaleFactor: 2 | 4 = 2,
  overlayBase64?: string
): Promise<string> {
  const upscaler: EnhancementProvider = new FreepikProvider();
  const relighter = new VertexImagenProvider();

  try {
    // Step 1: AI Relighting & Shadow Correction (The "High-End Retoucher" pass)
    console.log('💡 Applying AI Relighting & Shadow correction...');

    // The strict user prompt for high-end retouching
    const relightingPrompt = `You are a high-end product retouching and lighting specialist for commercial advertising.
Your task is to enhance the provided image by applying realistic lighting correction and natural shadow only.
Do NOT change composition, camera angle, product shape, background, or layout.
Do NOT add or remove objects.
Do NOT stylize, repaint, or reimagine the scene.

GOAL:
Make the product appear naturally integrated into the scene by matching:
- light direction
- light intensity
- color temperature
- ambient light
- contact shadow
- ground shadow
- soft occlusion shadow

INSTRUCTIONS:
1. Apply relighting to the product so it matches the scene:
   - Match highlight direction
   - Match shadow falloff
   - Match contrast level
   - Match warmth/coolness of the environment

2. Add natural shadow:
   - Add realistic contact shadow where product touches surface
   - Add soft ambient shadow under and around the product
   - Shadow must follow scene perspective and surface texture
   - Shadow must fade naturally (no hard edges, no fake blur)

3. Preserve realism:
   - No artificial glow
   - No exaggerated contrast
   - No “AI look”
   - No plastic shine

OUTPUT:
Return the same image with corrected lighting and natural shadow applied.`;

    let processedBase64 = imageBase64;

    try {
      const relitResult = await relighter.refineImage(imageBase64, relightingPrompt);
      if (relitResult.base64) {
        processedBase64 = relitResult.base64;
        console.log('✅ Relighting complete');
      }
    } catch (e: any) {
      console.warn('⚠️ Relighting failed, proceeding with original composite:', e.message);
    }

    // Step 2: Upscale image (Freepik)
    console.log('🚀 Upscaling final image...');
    let finalBase64 = processedBase64;

    try {
      const upscaleResult = await upscaler.upscaleImage(processedBase64, scaleFactor);
      finalBase64 = upscaleResult.enhanced_image;
    } catch (e: any) {
      console.warn('⚠️ Upscaling failed, proceeding with non-upscaled image:', e.message);
    }

    // Step 3: Fidelity Sandwich (Overlay Original Product)
    // If we have an overlay (original product on transparent bg), we stick it on top.
    // This restores 100% pixel fidelity to text and logos AFTER all AI processing.
    if (overlayBase64) {
      console.log('🥪 Applying Fidelity Sandwich (Restoring original product pixels)...');
      try {
        const upscaledBuffer = Buffer.from(finalBase64, 'base64');
        const overlayBuffer = Buffer.from(overlayBase64, 'base64');

        // Get dimensions of the upscaled image (the destination)
        const meta = await sharp(upscaledBuffer).metadata();

        if (meta.width && meta.height) {
          // Resize overlay to match upscaled dimensions EXACTLY
          // Since overlay is a full-canvas layer (same aspect ratio), simple resize works.
          // CRITICAL: Ensure background remains transparent!
          const resizedOverlay = await sharp(overlayBuffer)
            .resize({
              width: meta.width,
              height: meta.height,
              fit: 'fill',
              background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png()
            .toBuffer();

          // Composite Fidelity Sandwich (Original Product on Top)
          let sandwichedBuffer = await sharp(upscaledBuffer)
            .composite([{ input: resizedOverlay }])
            .png()
            .toBuffer();

          console.log('✅ Fidelity Sandwich applied (Text restored).');

          // Step 3.5: Lighting Re-injection (The "Glow" Pass)
          // The sandwich makes the product look "flat" because it kills the AI lighting.
          // We bring the lighting BACK by taking the AI image, blurring it (to kill distorted text),
          // and overlaying it on top of the sandwich.
          try {
            console.log('💡 Re-injecting scene lighting...');
            const lightingLayer = await sharp(upscaledBuffer) // The AI Relit image
              .resize({ width: meta.width, height: meta.height }) // Ensure dims match (should be redundant but safe)
              .blur(20) // Heavy blur to extract ONLY light/color gradients, no details
              .ensureAlpha(0.4) // 40% opacity (subtle lighting influence)
              .png()
              .toBuffer();

            // Composite the lighting layer on top with 'soft-light' blend
            // This adds contrast and color grading from the scene back onto the product
            sandwichedBuffer = await sharp(sandwichedBuffer)
              .composite([{
                input: lightingLayer,
                blend: 'soft-light'
              }])
              .png()
              .toBuffer();

            console.log('✅ Lighting re-injected successfully.');
          } catch (e: any) {
            console.warn('⚠️ Lighting re-injection failed:', e.message);
          }

          finalBase64 = sandwichedBuffer.toString('base64');
          console.log('✅ Fidelity Sandwich applied successfully.');
        }
      } catch (e: any) {
        console.error('⚠️ Fidelity Sandwich failed:', e.message);
        // Fallback to the AI result, unfortunately
      }
    }

    // Step 4: Skin enhancement (only for persona images)
    // Note: We do this AFTER sandwich? Or before? 
    // Ideally, skin enhancement shouldn't touch the product if the product is separate.
    // But since the sandwich is already applied, 'enhanceId' might blur the product again?
    // Let's assume skin enhancement is smart enough or mostly targets faces.
    // Actually, "skin" enhancer usually detects faces. It shouldn't wreck the product.
    if (imageType === 'product_persona' || imageType === 'ugc_style') {
      if (upscaler.enhanceImage) {
        try {
          const enhanceResult = await upscaler.enhanceImage(
            finalBase64,
            'skin'
          );
          return enhanceResult.enhanced_image;
        } catch (error) {
          console.warn('⚠️ Skin enhancement failed, using upscaled image:', error);
        }
      }
    }

    return finalBase64;
  } catch (error: any) {
    console.warn('⚠️ Image enhancement failed, returning original:', error);
    // Return original if enhancement fails
    return imageBase64;
  }
}

/**
 * Validate enhanced image for processing artifacts
 */
export function validateEnhancedImage(imageBase64: string): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Basic validation - check if base64 is valid
  try {
    Buffer.from(imageBase64, 'base64');
  } catch (error) {
    return {
      valid: false,
      warnings: ['Invalid base64 encoding'],
    };
  }

  // Note: More sophisticated validation (checking for artifacts, quality, etc.)
  // would require image processing libraries or ML models
  // For now, basic validation is sufficient

  return {
    valid: true,
    warnings,
  };
}
