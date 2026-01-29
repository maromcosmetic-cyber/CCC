/**
 * Replicate Image Generation Provider
 * 
 * High-quality photorealistic image generation using Replicate API
 * Replaces Banana Pro for better quality results.
 * 
 * Models available:
 * - stability-ai/sdxl: General purpose, high quality
 * - fofr/face-to-many: Better facial consistency
 * - lucatco/sdxl-controlnet: Precise composition control
 */

import Replicate from 'replicate';
import { ImageProvider, ImageResult, ImageOptions } from '../base/ImageProvider';

export interface ReplicateOptions extends ImageOptions {
    numInferenceSteps?: number;
    guidanceScale?: number;
    scheduler?: string;
    seed?: number;
}

export class ReplicateProvider implements ImageProvider {
    private replicate: Replicate;
    private maxRetries = 3;
    private retryDelayMs = 1000;

    // Model identifier - typed as template literal for Replicate SDK
    private sdxlModel: `${string}/${string}:${string}` = 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b';
    private ipAdapterModel: `${string}/${string}` = 'lucataco/ip-adapter-sdxl-face:e91404c441584c0429a1b021312384358a946b86A5123d467885361288c8352b'; // Using face adapter for now, better general one exist?
    // Using easel/advanced-face-swap for high quality face swapping
    private faceSwapModel: `${string}/${string}` = 'easel/advanced-face-swap:172153b926343513b6aa366aee57ebad63b40552b570cb0768c818815152a512';
    // General IP Adapter for objects (using a known working one)
    private objectIpAdapterModel: `${string}/${string}` = 'lucataco/ip-adapter-sdxl:f54784913c544e304f56f4d04865fc2693898f988223c21c60803cc2717ce91d';
    // Background Removal Model
    private rembgModel: `${string}/${string}:${string}` = 'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003';

    constructor() {
        const apiToken = process.env.REPLICATE_API_TOKEN;
        if (!apiToken) {
            console.warn('⚠️ REPLICATE_API_TOKEN not configured - Replicate provider will fail on API calls');
        }
        this.replicate = new Replicate({
            auth: apiToken || '',
        });
    }

    /**
     * Generate background image from location description
     */
    async generateBackground(location: string): Promise<ImageResult> {
        const prompt = `A beautiful empty background scene of ${location}, no product, no person, background only, copy space, professional photography, high quality, 8k. Negative prompt: product, bottle, can, package, object, person, text`;
        return this.generateImage(prompt, { aspectRatio: '1:1' });
    }

    /**
     * Remove background from image using Replicate (cjwbw/rembg)
     */
    async removeBackground(imageUrl: string): Promise<{ base64: string; url: string }> {
        console.log('✂️ Replicate: Removing background with rembg...');

        // cjwbw/rembg takes 'image' as input
        const input = { image: imageUrl };

        const output = await this.runWithRetry(async () => {
            return await this.replicate.run(this.rembgModel, { input });
        });

        // Output should be a URL string
        const outputUrl = typeof output === 'string' ? output : (output as any).url || String(output);

        if (!outputUrl || !outputUrl.startsWith('http')) {
            throw new Error(`Failed to remove background: Invalid output ${outputUrl}`);
        }

        console.log('✅ Background removed successfully');
        const base64 = await this.urlToBase64(outputUrl);
        return { base64, url: outputUrl };
    }


    /**
     * Generate image from text prompt using SDXL
     */
    async generateImage(prompt: string, options?: ReplicateOptions): Promise<ImageResult> {
        const enhancedPrompt = this.enhancePrompt(prompt, options);

        const input = this.buildSDXLInput(enhancedPrompt, options);

        console.log('🎨 Replicate: Generating image with SDXL...');
        console.log(`   Prompt: ${enhancedPrompt.substring(0, 100)}...`);

        const output = await this.runWithRetry(async () => {
            return await this.replicate.run(this.sdxlModel, { input }) as string[];
        });

        if (!output || output.length === 0) {
            throw new Error('No output from Replicate SDXL model');
        }

        const imageUrl = output[0];
        console.log('✅ Replicate: Image generated successfully');

        // Download image and convert to base64
        const base64 = await this.urlToBase64(imageUrl);

        return {
            url: imageUrl,
            base64,
            format: 'png',
            width: this.getWidth(options),
            height: this.getHeight(options),
            metadata: {
                provider: 'replicate',
                model: 'sdxl',
                prompt: enhancedPrompt,
                options: input,
            },
        };
    }

    /**
     * Generate image with persona reference using InstantID
     * InstantID is specifically designed for identity-preserving generation
     * from a single reference image - much better than SDXL img2img
     */
    async generateWithPersona(
        personaImageUrl: string,
        prompt: string,
        options?: ReplicateOptions
    ): Promise<ImageResult> {
        // InstantID model - state-of-the-art for identity preservation
        const instantIdModel: `${string}/${string}` = 'zsxkib/instant-id';

        const enhancedPrompt = this.enhancePrompt(prompt, options);

        // InstantID specific parameters
        const input = {
            image: personaImageUrl,
            prompt: enhancedPrompt,
            negative_prompt: options?.negativePrompt || 'cartoon, anime, drawing, unrealistic, low quality, blurry, distorted, deformed, ugly, bad anatomy, bad proportions, watermark, text, logo, holding product, holding bottle',
            num_steps: options?.numInferenceSteps || 30,
            guidance_scale: options?.guidanceScale || 5,
            ip_adapter_scale: 0.8, // Identity preservation strength (0.0-1.5)
            controlnet_conditioning_scale: 0.8, // Face structure adherence
            seed: options?.seed,
        };

        console.log('🎨 Replicate: Generating with InstantID (Identity-Preserving)...');
        console.log(`   Persona URL: ${personaImageUrl.substring(0, 50)}...`);
        console.log(`   IP Adapter Scale: ${input.ip_adapter_scale}`);
        console.log(`   Prompt: ${enhancedPrompt.substring(0, 80)}...`);

        const output = await this.runWithRetry(async () => {
            return await this.replicate.run(instantIdModel, { input }) as string[];
        });

        if (!output || output.length === 0) {
            throw new Error('No output from InstantID model');
        }

        const imageUrl = Array.isArray(output) ? output[0] : output;
        console.log('✅ Replicate: InstantID image generated successfully');

        const base64 = await this.urlToBase64(imageUrl as string);

        return {
            url: imageUrl as string,
            base64,
            format: 'png',
            width: this.getWidth(options),
            height: this.getHeight(options),
            metadata: {
                provider: 'replicate',
                model: 'instant-id',
                type: 'identity_preserving',
                prompt: enhancedPrompt,
                ip_adapter_scale: input.ip_adapter_scale,
            },
        };
    }

    /**
     * Refine an existing image with a prompt
     */
    async refineImage(
        base64Image: string,
        prompt: string,
        options?: ReplicateOptions
    ): Promise<ImageResult> {
        // Convert base64 to data URL for Replicate
        const dataUrl = base64Image.startsWith('data:')
            ? base64Image
            : `data:image/png;base64,${base64Image}`;

        const enhancedPrompt = this.enhancePrompt(prompt, options);

        const input = {
            ...this.buildSDXLInput(enhancedPrompt, options),
            image: dataUrl,
            strength: options?.strength ?? 0.5, // Lower strength for refinement
        };

        console.log('🔧 Replicate: Refining image...');

        const output = await this.runWithRetry(async () => {
            return await this.replicate.run(this.sdxlModel, { input }) as string[];
        });

        if (!output || output.length === 0) {
            throw new Error('No output from refinement');
        }

        const imageUrl = output[0];
        const resultBase64 = await this.urlToBase64(imageUrl);

        return {
            url: imageUrl,
            base64: resultBase64,
            format: 'png',
            metadata: {
                provider: 'replicate',
                model: 'sdxl',
                type: 'refinement',
                prompt: enhancedPrompt,
            },
        };
    }

    /**
     * Recompose product into a new scene (img2img)
     */
    async recomposeProduct(
        productImageBase64: string,
        scenePrompt: string,
        options?: ReplicateOptions
    ): Promise<ImageResult> {
        const dataUrl = productImageBase64.startsWith('data:')
            ? productImageBase64
            : `data:image/png;base64,${productImageBase64}`;

        const enhancedPrompt = this.enhancePrompt(scenePrompt, options);

        // For product recomposition, use medium strength to preserve product identity
        const input = {
            ...this.buildSDXLInput(enhancedPrompt, options),
            image: dataUrl,
            strength: options?.strength ?? 0.6,
        };

        console.log('📦 Replicate: Recomposing product into scene...');

        const output = await this.runWithRetry(async () => {
            return await this.replicate.run(this.sdxlModel, { input }) as string[];
        });

        if (!output || output.length === 0) {
            throw new Error('No output from product recomposition');
        }

        const imageUrl = output[0];
        const base64 = await this.urlToBase64(imageUrl);

        return {
            url: imageUrl,
            base64,
            format: 'png',
            metadata: {
                provider: 'replicate',
                model: 'sdxl',
                type: 'product_recomposition',
                prompt: enhancedPrompt,
            },
        };
    }

    /**
     * Generate UGC-style image with persona and product
     */
    async generateUGCStyle(
        productImageBase64: string,
        personaImageBase64: string,
        prompt: string,
        options?: ReplicateOptions
    ): Promise<ImageResult> {
        // For UGC, use persona as the base with relatively high strength
        const dataUrl = personaImageBase64.startsWith('data:')
            ? personaImageBase64
            : `data:image/png;base64,${personaImageBase64}`;

        const ugcPrompt = `${prompt}. UGC style, selfie, authentic candid moment, natural lighting, smartphone camera aesthetic, person talking to camera`;
        const enhancedPrompt = this.enhancePrompt(ugcPrompt, options);

        const input = {
            ...this.buildSDXLInput(enhancedPrompt, options),
            image: dataUrl,
            strength: options?.strength ?? 0.75,
            width: 768,
            height: 1344, // 9:16 ratio for UGC
        };

        console.log('📱 Replicate: Generating UGC-style image...');

        const output = await this.runWithRetry(async () => {
            return await this.replicate.run(this.sdxlModel, { input }) as string[];
        });

        if (!output || output.length === 0) {
            throw new Error('No output from UGC generation');
        }

        const imageUrl = output[0];
        const base64 = await this.urlToBase64(imageUrl);

        return {
            url: imageUrl,
            base64,
            format: 'png',
            width: 768,
            height: 1344,
            metadata: {
                provider: 'replicate',
                model: 'sdxl',
                type: 'ugc_style',
                prompt: enhancedPrompt,
            },
        };
    }

    /**
     * Relight an image to blend product with background
     * Uses IC-Light (Illumination Control) to harmonize lighting
     */
    async relightImage(
        compositeImageBase64: string,
        lightingPrompt: string,
        options?: ReplicateOptions
    ): Promise<ImageResult> {
        // IC-Light model for relighting/harmonization
        const icLightModel: `${string}/${string}` = 'lucataco/ic-light:fcb790d81555543e5c94cd1c59c5d1947844a42b918a99477755f9a6572714a9';

        const dataUrl = compositeImageBase64.startsWith('data:')
            ? compositeImageBase64
            : `data:image/png;base64,${compositeImageBase64}`;

        const input = {
            subject_image: dataUrl,
            prompt: `${lightingPrompt}, cinematic lighting, photorealistic, 8k, soft shadows`,
            // Background mode options vary by model version, but default usually relights the subject against the generic background
            // or treats the input as "Foreground+Background" and harmonizes them.
            // For lucataco/ic-light, subject_image is the main input.
            num_samples: 1,
            image_width: 1024,
            image_height: 1024,
            steps: 25,
            guidance_scale: 2.0 // Keep low to preserve product details/text
        };

        console.log('💡 Replicate: Relighting composite with IC-Light...');

        try {
            const output = await this.runWithRetry(async () => {
                return await this.replicate.run(icLightModel, { input });
            });

            if (!output) throw new Error('No output from relighting');

            // Handle potential array or string output
            const imageUrl = Array.isArray(output) ? output[0] : (output as any).output || output;
            const base64 = await this.urlToBase64(imageUrl as string);

            return {
                url: imageUrl as string,
                base64,
                format: 'png',
                width: 1024,
                height: 1024,
                metadata: {
                    provider: 'replicate',
                    model: 'ic-light',
                    type: 'relighting',
                    prompt: lightingPrompt
                }
            };
        } catch (error) {
            console.warn('Relighting failed, returning original:', error);
            // Return original if fails
            const originalBase64 = compositeImageBase64.replace(/^data:image\/\w+;base64,/, '');
            return {
                base64: originalBase64,
                url: '',
                format: 'png',
                width: 1024,
                height: 1024,
                metadata: { error: 'Relighting failed' }
            };
        }
    }
    /**
     * Swap face in target image with source face
     */
    async swapFace(
        targetImageUrl: string,
        sourceFaceUrl: string
    ): Promise<ImageResult> {
        console.log('🎭 Replicate: Swapping face...');

        try {
            const output = await this.runWithRetry(async () => {
                return await this.replicate.run(this.faceSwapModel, {
                    input: {
                        target_image: targetImageUrl,
                        swap_image: sourceFaceUrl,
                        upscale: true // Ensure high quality result
                    }
                });
            });

            if (!output) throw new Error('Face swap failed');

            // Output might be string or object depending on model version
            const resultUrl = typeof output === 'string' ? output : (output as any).image || (output as any)[0];

            const base64 = await this.urlToBase64(resultUrl);

            return {
                url: resultUrl,
                base64,
                format: 'png',
                width: 1024,
                height: 1024,
                metadata: {
                    provider: 'replicate',
                    model: 'face-swap',
                    type: 'face_swap'
                }
            };
        } catch (error) {
            console.error('Face swap error:', error);
            throw error;
        }
    }

    /**
     * Generate image using Product as IP-Adapter reference
     * This ensures the generated object looks like the product
     */
    async generateWithProductReference(
        productImageUrl: string,
        prompt: string,
        options?: ReplicateOptions
    ): Promise<ImageResult> {
        console.log('📦 Replicate: Generating with Product IP-Adapter...');

        const enhancedPrompt = this.enhancePrompt(prompt, options);

        const input = {
            image: productImageUrl, // This is the IP-Adapter image (the product)
            prompt: enhancedPrompt,
            negative_prompt: options?.negativePrompt || 'text, watermark, low quality, blurry, deformed, bad anatomy, bad hands, missing fingers, extra digits',
            scale: 0.8, // High fidelity to product appearance
            num_outputs: 1,
            num_inference_steps: 30,
            guidance_scale: 7.5
        };

        try {
            const output = await this.runWithRetry(async () => {
                // Use general IP-Adapter or Face adapter if general fails (fallback logic to be safe)
                // For now trying object adapter
                return await this.replicate.run(this.objectIpAdapterModel, { input });
            });

            if (!output) throw new Error('IP-Adapter generation failed');

            const resultUrl = Array.isArray(output) ? output[0] : output;
            const base64 = await this.urlToBase64(resultUrl as string);

            return {
                url: resultUrl as string,
                base64,
                format: 'png',
                width: 1024,
                height: 1024,
                metadata: {
                    provider: 'replicate',
                    model: 'ip-adapter',
                    prompt: enhancedPrompt
                }
            };
        } catch (error) {
            console.error('Product IP-Adapter error:', error);
            // Fallback to standard SDXL if detailed IP-Adapter fails
            return this.generateImage(prompt, options);
        }
    }

    /**
     * Composite with Flux Kontext (Experimental)
     */
    async compositeWithFluxKontext(
        sceneImageUrl: string,
        productImageUrl: string,
        productDescription: string,
        placementZone: string = 'left',
        options?: ReplicateOptions
    ): Promise<ImageResult> {
        // Flux Kontext Pro - best for image editing with object preservation
        const fluxKontextModel: `${string}/${string}` = 'black-forest-labs/flux-kontext-pro';

        // Build the compositing prompt
        const positionDescription = this.getPositionDescription(placementZone);
        const prompt = `Add the ${productDescription} to the ${positionDescription}. 
        The product must appear exactly as shown in the reference image with all text, labels, and branding perfectly preserved and readable. 
        Blend the product naturally into the scene with appropriate lighting and shadows. 
        Keep the person and background exactly as they are.`;

        const input = {
            input_image: sceneImageUrl,
            prompt: prompt,
            aspect_ratio: options?.aspectRatio || '1:1',
            guidance_scale: options?.guidanceScale || 7.5,
            seed: options?.seed,
        };

        console.log('📦 Replicate: Compositing product with Flux Kontext Pro...');
        console.log(`   Scene: ${sceneImageUrl.substring(0, 50)}...`);
        console.log(`   Product: ${productDescription}`);
        console.log(`   Placement: ${placementZone}`);

        const output = await this.runWithRetry(async () => {
            return await this.replicate.run(fluxKontextModel, { input });
        });

        if (!output) {
            throw new Error('No output from Flux Kontext model');
        }

        const imageUrl = Array.isArray(output) ? output[0] : output;
        console.log('✅ Replicate: Product composited successfully with Flux Kontext');

        const base64 = await this.urlToBase64(imageUrl as string);

        return {
            url: imageUrl as string,
            base64,
            format: 'png',
            width: this.getWidth(options),
            height: this.getHeight(options),
            metadata: {
                provider: 'replicate',
                model: 'flux-kontext-pro',
                type: 'product_composite',
                prompt,
                placementZone,
            },
        };
    }

    /**
     * Get natural language position description for Flux Kontext
     */
    private getPositionDescription(zone: string): string {
        switch (zone) {
            case 'left': return 'left side of the frame, on a shelf or surface';
            case 'right': return 'right side of the frame, on a shelf or surface';
            case 'center': return 'center of the frame, prominently displayed';
            case 'bottom-left': return 'bottom left corner, on a surface';
            case 'bottom-right': return 'bottom right corner, on a surface';
            default: return 'left side of the frame';
        }
    }

    // ============ Private Helper Methods ============

    /**
     * Build SDXL input parameters
     */
    private buildSDXLInput(prompt: string, options?: ReplicateOptions): Record<string, any> {
        return {
            prompt,
            negative_prompt: options?.negativePrompt || 'cartoon, anime, drawing, unrealistic, low quality, blurry, distorted, deformed, ugly, bad anatomy, bad proportions, watermark, text, logo',
            width: this.getWidth(options),
            height: this.getHeight(options),
            num_outputs: 1,
            scheduler: options?.scheduler || 'DPMSolverMultistep',
            num_inference_steps: options?.numInferenceSteps || 50,
            guidance_scale: options?.guidanceScale || 7.5,
            ...(options?.seed && { seed: options.seed }),
        };
    }

    /**
     * Enhance prompt with quality keywords
     */
    private enhancePrompt(prompt: string, options?: ImageOptions): string {
        if (options?.realismKeywords === false) {
            return prompt;
        }
        return `${prompt}, professional photography, photorealistic, high quality, 8k, detailed, sharp focus, natural lighting, realistic skin texture, studio lighting`;
    }

    /**
     * Calculate width from aspect ratio
     */
    private getWidth(options?: ImageOptions): number {
        if (options?.width) return options.width;

        switch (options?.aspectRatio) {
            case '16:9': return 1344;
            case '9:16': return 768;
            case '4:5': return 896;
            default: return 1024; // 1:1
        }
    }

    /**
     * Calculate height from aspect ratio
     */
    private getHeight(options?: ImageOptions): number {
        if (options?.height) return options.height;

        switch (options?.aspectRatio) {
            case '16:9': return 768;
            case '9:16': return 1344;
            case '4:5': return 1088;
            default: return 1024; // 1:1
        }
    }

    /**
     * Run function with retry logic and exponential backoff
     * Handles 429 Rate Limits by respecting retry_after
     */
    private async runWithRetry<T>(fn: () => Promise<T>): Promise<T> {
        let lastError: Error | null = null;
        // Increase max retries for rate limits
        const effectiveMaxRetries = this.maxRetries + 2;

        for (let attempt = 0; attempt < effectiveMaxRetries; attempt++) {
            try {
                return await fn();
            } catch (error: any) {
                lastError = error;

                // Detect 429 Rate Limit
                const errorMessage = error?.message || '';
                const isRateLimit = errorMessage.includes('429') || errorMessage.includes('Too Many Requests');

                if (isRateLimit) {
                    // Try to parse retry_after from error message
                    // Format: "retry_after":6
                    const match = errorMessage.match(/"retry_after":\s*(\d+)/);
                    const retryAfterSeconds = match ? parseInt(match[1]) : 10; // Default to 10s

                    const waitMs = (retryAfterSeconds + 1) * 1000; // Add 1s buffer

                    console.warn(`🛑 Replicate Rate Limit (429). Waiting ${retryAfterSeconds}s before retry...`);
                    await new Promise(resolve => setTimeout(resolve, waitMs));

                    // Don't count rate limit waits as standard retries (or allow extra attempts)
                    continue;
                }

                console.warn(`⚠️ Replicate attempt ${attempt + 1}/${effectiveMaxRetries} failed:`, errorMessage);

                if (attempt < effectiveMaxRetries - 1) {
                    const delay = this.retryDelayMs * Math.pow(2, attempt);
                    console.log(`   Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError || new Error('Max retries exceeded');
    }

    /**
     * Convert URL to base64
     */
    private async urlToBase64(url: string): Promise<string> {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            return buffer.toString('base64');
        } catch (error) {
            console.warn('Failed to convert URL to base64:', error);
            return '';
        }
    }
}
