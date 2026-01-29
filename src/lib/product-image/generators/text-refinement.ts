import { VertexImagenProvider } from '@/lib/providers/google-imagen/VertexImagenProvider';

/**
 * Refines the text on a generated image using the original product as a reference.
 * This is a "Safety Net" feature for when Generative AI distorts text.
 * 
 * @param generatedImageBase64 The AI-generated image with potential text issues
 * @param productReferenceBase64 The original product image (Ground Truth)
 * @param productText The detected text on the product (optional, for backup prompt)
 */
export async function refineProductText(
    generatedImageBase64: string,
    productReferenceBase64: string,
    productText: string = ""
): Promise<string> {
    const imagen = new VertexImagenProvider();

    // Prompt specifically for text restoration
    const prompt = `
        Refine this image. 
        CRITICAL TASK: Restore the product label text to match the reference image exactly.
        The text on the product should read: "${productText}".
        Fix any typos, blurring, or distortion. 
        Make the text SHARP, LEGIBLE, and OCR-READY.
        Do not change the lighting or hand position. Only fix the text.
    `;

    console.log('🔧 Refining Image Text...');

    try {
        const result = await imagen.refineImage(generatedImageBase64, prompt, {
            referenceImages: [productReferenceBase64], // Pass the Ground Truth product
            temperature: 0.1, // Ultra-low temperature for correction
            negativePrompt: "blur, typo, distortion, hallucination, wrong spelling, messy text"
        });

        if (result.base64) {
            return result.base64;
        } else {
            throw new Error("Refinement returned no image");
        }
    } catch (e) {
        console.error("Text Refinement Failed:", e);
        // Fallback: Return original if refinement fails (don't break the flow)
        return generatedImageBase64;
    }
}
