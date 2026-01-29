
import { Product, ProductImageIntent } from '@/types/models';
import { VertexImagenProvider } from '@/lib/providers/google-imagen/VertexImagenProvider';
import { GoogleVisionProvider } from '@/lib/providers/google-vision/GoogleVisionProvider';
import { buildRecompositionPrompt } from '../realism-enhancer';

export type IntentConfig = {
    framing: string;
    lighting: string;
    background: string;
    composition: string;
    negative_prompt: string;
};

const INTENT_PRESETS: Record<ProductImageIntent, IntentConfig> = {
    primary_hero: {
        framing: "Professional Studio Product Photography. Frontal view. The product is the sole focus.",
        lighting: "Soft studio lighting, neutral white light, even illumination to ensure text visibility.",
        background: "Clean neutral studio background. Soft shadows. High quality.",
        composition: "Centered. High resolution.",
        negative_prompt: "distortion, bad text, bad logo, warped, rendering artifacts, blurry, dark, low resolution",
    },
    gallery_lifestyle: {
        framing: "Product in a natural setting (on a table, in a room, or outdoors).",
        lighting: "Natural warm sunlight, golden hour, soft organic shadows.",
        background: "Blurred contextual background (bokeh), modern interior or nature scene suited to the product.",
        composition: "Rule of thirds, dynamic angle, lifestyle aesthetics.",
        negative_prompt: "studio background, white background, artificial lighting, text, watermark, bad composition",
    },
    ad_creative: {
        framing: "Product placed with negative space for text overlays. Wide shot.",
        lighting: "Dramatic contrast, high-energy lighting, vibrant colors.",
        background: "Solid bold color or abstract texture background. Clean areas for copy.",
        composition: "Off-center product placement (left or right commercial crop).",
        negative_prompt: "cluttered, busy background, no space for text, centered, boring",
    },
    thumbnail: {
        framing: "Tight crop on the main product feature. Zoomed in.",
        lighting: "Even, flat lighting to ensure visibility at small sizes.",
        background: "Solid distinctive color or white.",
        composition: "Center cut, macro details.",
        negative_prompt: "wide shot, small product, busy background, complex",
    },
    angle_variation: {
        framing: "Product shown from a dynamic 45-degree angle. Side profile visible.",
        lighting: "Dynamic 3-point lighting emphasising depth and form.",
        background: "Neutral studio infinity wall.",
        composition: "Diagonal composition.",
        negative_prompt: "flat, front view, 2d, distortion, broken geometry",
    },
    brand_identity: {
        framing: "Hero product shot, centered, premium presentation.",
        lighting: "Sophisticated, soft, high-end commercial study lighting.",
        background: "Abstract geometric shapes using brand colors. Gradient meshes.",
        composition: "Balanced, authoritative, clean lines.",
        negative_prompt: "cluttered, messy, neon, chaotic, conflicting colors",
    }
};

export async function generateProductImageWithIntent(
    product: Product,
    productImageUrl: string,
    intent: ProductImageIntent,
    imagen: VertexImagenProvider,
    vision: GoogleVisionProvider
) {
    const config = INTENT_PRESETS[intent];

    console.log(`[IntentGenerator] Starting generation for ${product.name} with intent ${intent}`);

    // 1. Isolate the product (Create Alpha Mask)
    // This ensures the product visual identity (logo, text, shape) is preserved.
    console.log('[IntentGenerator] Isolating product...');
    const isolatedProduct = await vision.isolateProduct(productImageUrl);

    // 2. Construct Prompt using Realism Enhancer
    // This adds crucial "Identity Lock" instructions to prevent hallucinations
    const intentPrompt = `
        ${config.framing}
        ${config.lighting}
        ${config.background}
        ${config.composition}
    `;

    // External "Identity Lock" Wrap (Standard Pattern in this Codebase)
    const fullPrompt = buildRecompositionPrompt(intentPrompt, 'product_only');

    const finalPrompt = `${fullPrompt} Negative prompt: ${config.negative_prompt}`;

    console.log(`[IntentGenerator] Recomposition Prompt (Alignment Mode): ${finalPrompt}`);

    // 3. Recompose Product
    return await imagen.recomposeProduct(
        isolatedProduct.isolated_image,
        finalPrompt,
        {
            aspectRatio: intent === 'ad_creative' ? '16:9' : '1:1',
            realismKeywords: false // Critical: Match product-only-generator options
        }
    );
}
