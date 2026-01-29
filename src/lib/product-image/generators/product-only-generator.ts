/**
 * Product-Only Image Generator
 * 
 * Generates lifestyle/studio backgrounds and composes products into scenes
 */

import { ImageProvider, ImageResult } from '@/lib/providers/base/ImageProvider';
import { VisionProvider, ProductIsolationResult } from '@/lib/providers/base/VisionProvider';
import { ScenePlanningResult } from '@/types/models';
import { VertexImagenProvider } from '@/lib/providers/google-imagen/VertexImagenProvider';
import { GoogleVisionProvider } from '@/lib/providers/google-vision/GoogleVisionProvider';
import { buildRecompositionPrompt } from '../realism-enhancer';

import { ImageCompositor } from '../compositing/ImageCompositor';

export interface ProductOnlyGenerationResult {
  isolated_product: ProductIsolationResult;
  background: ImageResult;
  final_image: ImageResult;
  scene_plan: ScenePlanningResult;
  overlay_image: string;
}

/**
 * Generate product-only image
 */
export async function generateProductOnlyImage(
  productImageUrl: string,
  scenePlan: ScenePlanningResult,
  imageProvider?: ImageProvider,
  visionProvider?: VisionProvider,
  enhancementProvider?: any // ReplicateProvider for relighting
): Promise<ProductOnlyGenerationResult> {
  // Use default providers if not provided
  const imagen = imageProvider || new VertexImagenProvider();
  const vision = visionProvider || new GoogleVisionProvider();
  const compositor = new ImageCompositor();

  try {
    // Step 1: Isolate product from background
    console.log('🔍 Isolating product from background...');
    let isolatedProduct = await vision.isolateProduct(productImageUrl);

    // FIX: Use optional AI Background Removal if available (Replicate)
    if (enhancementProvider && typeof enhancementProvider.removeBackground === 'function') {
      try {
        console.log('✂️ Performing High-Quality AI Background Removal...');
        const bgRemoved = await enhancementProvider.removeBackground(productImageUrl);
        if (bgRemoved.base64) {
          isolatedProduct.isolated_image = bgRemoved.base64;
          console.log('✅ Background removed successfully (AI)');
        }
      } catch (err) {
        console.warn('⚠️ Background removal failed, falling back to original:', err);
      }
    }

    // Step 2: Generate background scene
    console.log('🎨 Generating background scene...');
    const background = await imagen.generateBackground(scenePlan.scene_description);

    // Step 3: Composite product into scene (Zero Distortion)
    console.log('🖼️ Compositing product into scene (preserving definition)...');

    // Default to "tabletop" positioning (resting on surface)
    // and scaled to ~25% of height
    if (!background.base64) {
      throw new Error('Background generation failed (no base64)');
    }

    const compositeResult = await compositor.compositeProduct(
      background.base64,
      isolatedProduct.isolated_image,
      {
        productSizePercent: 0.60, // Much larger for hero focus (60% of height)
        verticalPosition: 'tabletop',
        shadow: true // Add shadow for realism
      }
    );

    const finalResult: ProductOnlyGenerationResult = {
      isolated_product: isolatedProduct,
      background,
      final_image: {
        base64: compositeResult.image,
        format: 'png',
        url: `data:image/png;base64,${compositeResult.image}`,
        metadata: {
          ...background.metadata,
          type: 'composite_product_only'
        }
      },
      overlay_image: compositeResult.overlay,
      scene_plan: scenePlan,
    };

    // Step 4: AI Relighting / Harmonization (Optional)
    // If an enhancement provider is available, use IC-Light to blend the product naturally
    if (finalResult.final_image.base64 && enhancementProvider && typeof enhancementProvider.relightImage === 'function') {
      console.log('🕯️ Enhancing realism with AI Relighting...');
      try {
        const relitResult = await enhancementProvider.relightImage(
          finalResult.final_image.base64,
          scenePlan.lighting || 'cinematic lighting, soft shadows'
        );

        if (relitResult.base64) {
          console.log('✅ Relighting successful, replacing final image');
          finalResult.final_image = {
            ...relitResult,
            metadata: {
              ...relitResult.metadata,
              type: 'composite_product_only_relit'
            }
          };
        }
      } catch (warn) {
        console.warn('Relighting step failed, keeping original composite:', warn);
      }
    }

    // Step 5: Final Overlay (Window Shadow / Light Leaks)
    // Must be applied LAST to ensure it sits on top of the relit image
    console.log('🏁 Applying final window shadow overlay...');
    try {
      if (finalResult.final_image.base64) {
        const currentBuffer = Buffer.from(finalResult.final_image.base64, 'base64');
        const shadowedBuffer = await compositor.applyWindowShadow(currentBuffer);

        finalResult.final_image.base64 = shadowedBuffer.toString('base64');
        finalResult.final_image.url = `data:image/png;base64,${finalResult.final_image.base64}`;
      }
    } catch (overlayError) {
      console.warn('Final overlay application failed:', overlayError);
    }

    return finalResult;
  } catch (error: any) {
    console.error('Product-only generation error:', error);
    throw new Error(`Failed to generate product-only image: ${error.message}`);
  }
}
