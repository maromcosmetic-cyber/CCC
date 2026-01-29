'use server';

import { refineProductText } from '@/lib/product-image/generators/text-refinement';

/**
 * Server Action to refine text on a generated image.
 * Wraps the backend utility for client-side use.
 */
export async function repairGeneratedImageText(
    generatedImageBase64: string,
    productReferenceBase64: string
) {
    try {
        console.log("🛠️ Server Action: Repairing Image Text...");
        const refinedBase64 = await refineProductText(generatedImageBase64, productReferenceBase64);
        return { success: true, base64: refinedBase64 };
    } catch (error: any) {
        console.error("Repair Text Action Failed:", error);
        return { success: false, error: error.message };
    }
}
