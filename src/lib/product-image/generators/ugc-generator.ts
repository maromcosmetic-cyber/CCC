/**
 * UGC Style Image Generator
 * 
 * Generates natural, candid settings with persona talking to camera holding product
 */

import { ImageProvider, ImageResult } from '@/lib/providers/base/ImageProvider';
import { VisionProvider, ProductIsolationResult } from '@/lib/providers/base/VisionProvider';
import { ScenePlanningResult, PersonaProfile } from '@/types/models';
import { VertexImagenProvider } from '@/lib/providers/google-imagen/VertexImagenProvider';
import { GoogleVisionProvider } from '@/lib/providers/google-vision/GoogleVisionProvider';
import { buildUGCPrompt } from '../realism-enhancer';
import { getPersonaImageUrl } from '../persona-context';

import { ImageCompositor } from '../compositing/ImageCompositor';

export interface UGCGenerationResult {
  isolated_product: ProductIsolationResult;
  final_image: ImageResult;
  scene_plan: ScenePlanningResult;
  overlay_image: string;
}

/**
 * Generate UGC style image
 */
export async function generateUGCImage(
  productImageUrl: string,
  persona: PersonaProfile,
  scenePlan: ScenePlanningResult,
  imageProvider?: ImageProvider,
  visionProvider?: VisionProvider
): Promise<UGCGenerationResult> {
  // Use default providers if not provided
  const imagen = imageProvider || new VertexImagenProvider();
  const vision = visionProvider || new GoogleVisionProvider();
  const compositor = new ImageCompositor();

  try {
    // Step 1: Isolate product from background
    console.log('🔍 Isolating product from background...');
    const isolatedProduct = await vision.isolateProduct(productImageUrl);

    // Step 2: Generate UGC scene (Persona talking to camera, no product or holding invisible obj)
    console.log('🎥 Generating UGC identity/scene...');

    // Construct detailed persona description
    const personaDescription = [
      persona.image_prompt,
      persona.casting_notes,
      persona.visual_style,
      persona.age_range ? `${persona.age_range} years old` : '',
      "Ensure consistent hair color, skin tone, and facial features.",
    ].filter(Boolean).join('. ');

    const prompt = `Selfie style photo, ${scenePlan.scene_description}. ${personaDescription}. Looking directly at camera, hand raised as if holding an object but hand is empty (or holding nothing). High quality smartphone photography aesthetic.`;

    const backgroundScene = await imagen.generateImage(prompt, {
      aspectRatio: '9:16', // UGC typically vertical
      realismKeywords: true
    });

    // Step 3: Composite product
    console.log('🖼️ Compositing product into UGC scene...');

    if (!backgroundScene.base64) {
      throw new Error('UGC scene generation failed (no base64)');
    }

    const compositeResult = await compositor.compositeProduct(
      backgroundScene.base64,
      isolatedProduct.isolated_image,
      {
        productSizePercent: 0.35, // Clear visibility in hand
        verticalPosition: 'bottom', // Bottom area (selfie hold zone)
        shadow: false // UGC usually handheld/in-air, shadow might look weird if wrong. 
        // Actually, if we want it to look "held", no shadow is better than a "table shadow" in mid-air.
      }
    );

    return {
      isolated_product: isolatedProduct,
      final_image: {
        base64: compositeResult.image,
        format: 'png',
        url: `data:image/png;base64,${compositeResult.image}`,
        metadata: {
          ...backgroundScene.metadata,
          type: 'composite_ugc_style'
        }
      },
      overlay_image: compositeResult.overlay,
      scene_plan: scenePlan,
    };
  } catch (error: any) {
    console.error('UGC generation error:', error);
    throw new Error(`Failed to generate UGC style image: ${error.message}`);
  }
}
