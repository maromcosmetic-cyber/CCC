
import { ImageProvider } from '../../providers/base/ImageProvider';
import { VisionProvider } from '../../providers/base/VisionProvider';
import { ReplicateProvider } from '../../providers/replicate/ReplicateProvider';
import { GoogleVisionProvider } from '../../providers/google-vision/GoogleVisionProvider';
import { PersonaProfile, ScenePlanningResult, ProductPersonaResult } from '../../../types/models';

/**
 * PRODUCT PERSONA GENERATOR (REBUILT)
 * 
 * Strategy: "Product First, Identity Second"
 * 1. Generate Scene using Product Reference (IP-Adapter)
 *    - Ensures correct product shape, color, and natural interaction (pouring, holding)
 * 2. Swap Face (Post-Process)
 *    - Injects the Persona's identity into the scene
 */
export async function generateProductPersonaImage(
  productImageUrl: string,
  persona: PersonaProfile,
  scenePlan: ScenePlanningResult,
  imageProvider?: ImageProvider,
  visionProvider?: VisionProvider
): Promise<ProductPersonaResult> {
  // 1. Setup Providers
  // Duck typing: Check if provider has required methods instead of strict instanceof
  // This avoids issues with circular dependencies or multiple module versions
  const replicate = (imageProvider as any) || new ReplicateProvider();

  const hasProductRef = typeof replicate.generateWithProductReference === 'function';
  const hasSwapFace = typeof replicate.swapFace === 'function';

  // Verify Provider Capabilities
  if (!hasProductRef || !hasSwapFace) {
    console.error("Provider missing required methods:", { hasProductRef, hasSwapFace });
    throw new Error("ReplicateProvider is required for high-fidelity product generation");
  }

  console.log("🚀 START: Generating Product-Persona Scene (Rebuilt Pipeline)");
  console.log(`   Product: ${scenePlan.composition_notes || 'Beauty Product'}`);
  console.log(`   Action:  ${scenePlan.product_action || 'Using product'}`);

  // 2. Prepare Inputs
  // Use product action from scene plan or default to 'holding'
  const action = scenePlan.product_action || 'holding';

  // Construct a prompt focused on the SCENE and ACTION first
  const prompt = `
    Professional lifestyle photography, shot on 35mm film.
    A person ${action} a ${scenePlan.composition_notes || 'beauty product'}.
    
    SCENE: ${scenePlan.scene_description}
    LIGHTING: ${scenePlan.lighting}
    MOOD: ${scenePlan.mood}
    
    The person's hand is ${action} the product naturally.
    Focus on the product interaction.
    Realism, 8k, highly detailed.
  `;

  const negativePrompt = "cartoon, drawing, anime, illustration, 3d render, plastic, fake, bad anatomy, deformed hands, missing fingers, extra fingers, floating objects, unnatural text, watermark";

  try {
    // ---------------------------------------------------------
    // PHASE 1: Generate Scene with Product Reference
    // ---------------------------------------------------------
    console.log("📦 PHASE 1: Generating scene with Product Reference...");

    // We use the product image as an IP-Adapter reference
    // This tells the AI: "Make the object in the scene look like THIS image"
    let baseScene = await replicate.generateWithProductReference(
      productImageUrl, // The Reference Image
      prompt,
      {
        aspectRatio: '1:1',
        negativePrompt
      }
    );

    if (!baseScene || (!baseScene.url && !baseScene.base64)) {
      throw new Error("Phase 1 generation failed - no image returned");
    }

    // Ensure we have a URL for Phase 2
    const sceneUrl = baseScene.url || `data:image/png;base64,${baseScene.base64}`;

    // ---------------------------------------------------------
    // PHASE 2: Face Swap (Identity Injection)
    // ---------------------------------------------------------
    if (persona.imageUrl) {
      console.log("🎭 PHASE 2: Injecting Persona Identity (Face Swap)...");
      try {
        const swappedScene = await replicate.swapFace(
          sceneUrl,        // Target: The scene with the correct product
          persona.imageUrl // Source: The persona face
        );

        console.log("✅ Identity injected successfully");
        baseScene = swappedScene; // Success!

      } catch (swapError) {
        console.warn("⚠️ Face swap failed, using generated face:", swapError);
        // We continue with specific product scene even if face swap fails
        // (Better to have correct product + random face than wrong product)
      }
    } else {
      console.log("ℹ️ No persona image provided, skipping face swap");
    }

    // ---------------------------------------------------------
    // FINALIZE
    // ---------------------------------------------------------
    return {
      isolated_product: { original_image: productImageUrl }, // Minimal data needed
      final_image: baseScene,
      scene_plan: scenePlan,
      overlay_image: baseScene.base64 || "" // No overlay used, but keeping field for type compatibility
    };

  } catch (error: any) {
    console.error("❌ Generator Failed:", error);
    throw error;
  }
}
