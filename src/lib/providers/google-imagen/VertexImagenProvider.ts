import { ImageProvider, ImageResult, ImageOptions } from '../base/ImageProvider';

/**
 * Vertex AI Imagen Provider
 * 
 * Uses Google's Imagen API for image generation
 * Supports text-to-image and image-to-image (recomposition)
 */
export class VertexImagenProvider implements ImageProvider {
  private apiKey?: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private defaultModel = 'models/nano-banana-pro-preview'; // User requested for Persona Consistency
  private imageToImageModel = 'models/nano-banana-pro-preview'; // For image-to-image (may need to be updated based on availability)

  constructor() {
    // Platform-managed: Use platform credentials from env vars
    this.apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_TTS_KEY;
  }

  /**
   * Refine an existing image based on a text prompt (Image-to-Image / Editing)
   * Used for Relighting and Shadow correction.
   */
  async refineImage(imageBase64: string, prompt: string, options?: ImageOptions): Promise<ImageResult> {
    if (!this.apiKey) {
      throw new Error('Google API key is not configured');
    }

    try {
      // Use image-to-image model
      const url = `${this.baseUrl}/${this.imageToImageModel}:generateContent?key=${this.apiKey}`;

      const parts: any[] = [
        { text: prompt },
        {
          inline_data: {
            mime_type: 'image/png',
            data: imageBase64,
          },
        },
      ];

      // Inject Reference Images if provided (Crucial for Text Fixing)
      if (options?.referenceImages && options.referenceImages.length > 0) {
        options.referenceImages.forEach(img => {
          parts.push({
            inline_data: {
              mime_type: 'image/png',
              data: img
            }
          });
        });
      }

      const payload = {
        contents: [
          {
            parts: parts,
          },
        ],
        generationConfig: {
          temperature: options?.temperature !== undefined ? options.temperature : 0.3,
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Imagen refinement error: ${errorData.error?.message || JSON.stringify(errorData)}`);
      }

      const data = await response.json();

      // Extract image from response (reuse shared logic if possible, but for now inline for safety)
      let base64: string | undefined;
      const candidates = data.candidates || [];
      if (candidates.length > 0) {
        const parts = candidates[0].content?.parts || [];
        const imgPart = parts.find((p: any) => p.inlineData || p.inline_data);
        if (imgPart) {
          base64 = imgPart.inlineData?.data || imgPart.inline_data?.data;
        }
      }

      if (!base64) {
        // Fallback check for 'predictions' format if model differs
        if (data.predictions && data.predictions[0]?.bytesBase64Encoded) {
          base64 = data.predictions[0].bytesBase64Encoded;
        }
      }

      if (!base64) {
        throw new Error('No image data returned from refinement model');
      }

      return {
        url: `data:image/png;base64,${base64}`,
        base64,
        format: 'png',
        metadata: {
          provider: 'vertex-imagen',
          model: this.imageToImageModel,
          prompt: prompt,
          type: 'refinement',
        },
      };

    } catch (error: any) {
      console.error('Image refinement error:', error);
      throw new Error(`Failed to refine image: ${error.message}`);
    }
  }

  async generateBackground(location: string): Promise<ImageResult> {
    const prompt = this.buildRealismPrompt(
      `A beautiful empty background scene of ${location}, no product, background only, copy space, professional photography, high quality. Negative prompt: product, bottle, can, package, object, person, text`,
      'product_only'
    );
    return this.generateImage(prompt, { realismKeywords: false }); // Already added in buildRealismPrompt
  }

  async generateImage(prompt: string, options?: ImageOptions): Promise<ImageResult> {
    if (!this.apiKey) {
      throw new Error('Google API key is not configured. Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.');
    }

    try {
      // Append realism keywords if requested
      const finalPrompt = options?.realismKeywords !== false
        ? this.buildRealismPrompt(prompt, 'product_only')
        : prompt;

      const requestedModel = options?.model || this.defaultModel;
      const isGenerateContentModel = requestedModel.includes('gemini') || requestedModel.includes('banana');

      let url: string;
      let payload: any;

      if (isGenerateContentModel) {
        // Use :generateContent endpoint (Gemini / Nano)
        url = `${this.baseUrl}/${requestedModel}:generateContent?key=${this.apiKey}`;

        const parts: any[] = [{ text: finalPrompt }];

        // Inject Reference Image (Single Legacy)
        if (options?.referenceImage) {
          parts.push({
            inline_data: {
              mime_type: 'image/png',
              data: options.referenceImage
            }
          });
        }

        // Inject Reference Images (Multiple - Subject Control)
        if (options?.referenceImages && options.referenceImages.length > 0) {
          options.referenceImages.forEach(ref => {
            let mimeType = 'image/png';
            let data = '';

            if (typeof ref === 'string') {
              data = ref;
            } else {
              data = ref.base64;
              mimeType = ref.mimeType || 'image/png';
            }

            parts.push({
              inline_data: {
                mime_type: mimeType,
                data: data
              }
            });
          });
        }

        payload = {
          contents: [{ parts: parts }],
          generationConfig: {
            temperature: options?.temperature !== undefined ? options.temperature : 0.4,
            // Map Aspect Ratio strings to assumptions if needed, or pass-thru if model supports
          }
        };
      } else {
        // Use :predict endpoint (Imagen Legacy)
        url = `${this.baseUrl}/${requestedModel}:predict?key=${this.apiKey}`;
        payload = {
          instances: [{ prompt: finalPrompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: options?.aspectRatio || '1:1',
          },
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Check for API not enabled error
        if (errorData.error?.code === 403 && (errorData.error?.message?.includes('not been used') || errorData.error?.message?.includes('disabled'))) {
          const activationUrl = errorData.error?.details?.[0]?.metadata?.activationUrl ||
            errorData.error?.details?.find((d: any) => d['@type']?.includes('ErrorInfo'))?.metadata?.activationUrl;

          throw new Error(
            `Generative Language API is not enabled. ` +
            `Please enable it at: ${activationUrl || 'https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com'} ` +
            `Then wait a few minutes and try again.`
          );
        }

        throw new Error(`Imagen API error: ${errorData.error?.message || JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      let base64: string | undefined;

      // Handle RESPONSE FORMATS

      // Format 1: :predict (Imagen)
      if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
        base64 = data.predictions[0].bytesBase64Encoded;
      }
      // Format 2: :generateContent (Gemini / Nano)
      else if (data.candidates && data.candidates.length > 0) {
        const parts = data.candidates[0].content?.parts || [];
        // Try finding image part
        const imgPart = parts.find((p: any) => p.inlineData || p.inline_data);
        if (imgPart) {
          base64 = imgPart.inlineData?.data || imgPart.inline_data?.data;
        }
      }

      if (base64) {
        return {
          url: `data:image/png;base64,${base64}`,
          base64,
          format: 'png',
          metadata: {
            provider: 'vertex-imagen',
            model: requestedModel,
            prompt: finalPrompt,
            aspectRatio: options?.aspectRatio || '1:1',
          },
        };
      } else {
        throw new Error('No image data in response');
      }
    } catch (error: any) {
      console.error('Image generation error:', error);
      throw new Error(`Failed to generate image: ${error.message}`);
    }
  }

  async recomposeProduct(productImageBase64: string, scenePrompt: string, options?: ImageOptions): Promise<ImageResult> {
    if (!this.apiKey) {
      throw new Error('Google API key is not configured');
    }

    try {
      // Build product recomposition prompt with realism keywords
      const finalPrompt = this.buildRecompositionPrompt(scenePrompt, 'product_only');

      // Use image-to-image model (may need adjustment based on actual API availability)
      const url = `${this.baseUrl}/${this.imageToImageModel}:generateContent?key=${this.apiKey}`;

      const payload = {
        contents: [
          {
            parts: [
              { text: finalPrompt },
              {
                inline_data: {
                  mime_type: 'image/png',
                  data: productImageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Check for API not enabled error
        if (errorData.error?.code === 403 && (errorData.error?.message?.includes('not been used') || errorData.error?.message?.includes('disabled'))) {
          const activationUrl = errorData.error?.details?.[0]?.metadata?.activationUrl ||
            errorData.error?.details?.find((d: any) => d['@type']?.includes('ErrorInfo'))?.metadata?.activationUrl;

          throw new Error(
            `Generative Language API is not enabled. ` +
            `Please enable it at: ${activationUrl || 'https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com'} ` +
            `Then wait a few minutes and try again.`
          );
        }

        throw new Error(`Imagen recomposition error: ${errorData.error?.message || JSON.stringify(errorData)}`);
      }

      const data = await response.json();

      // Log response structure for debugging (without full base64)
      console.log('🔍 Recomposition API response structure:', {
        hasCandidates: !!data.candidates,
        candidatesLength: data.candidates?.length || 0,
        hasPredictions: !!data.predictions,
        predictionsLength: data.predictions?.length || 0,
        keys: Object.keys(data),
      });

      // Parse response (format may vary based on model)
      // Try multiple response formats
      let base64: string | undefined;

      // Format 1: Standard Gemini generateContent format (camelCase: inlineData)
      if (data.candidates && data.candidates.length > 0) {
        const contentParts = data.candidates[0].content?.parts || [];

        // Try camelCase first (standard Gemini format)
        const imagePartCamel = contentParts.find((p: any) => p.inlineData);
        if (imagePartCamel?.inlineData?.data) {
          base64 = imagePartCamel.inlineData.data;
          console.log('✅ Found image in inlineData (camelCase)');
        }

        // Try snake_case as fallback
        if (!base64) {
          const imagePartSnake = contentParts.find((p: any) => p.inline_data);
          if (imagePartSnake?.inline_data?.data) {
            base64 = imagePartSnake.inline_data.data;
            console.log('✅ Found image in inline_data (snake_case)');
          }
        }

        // Check if there's text instead of image (error case)
        const textPart = contentParts.find((p: any) => p.text);
        if (textPart && !base64) {
          console.warn('⚠️ Model returned text instead of image:', textPart.text.substring(0, 200));
          throw new Error(`Model returned text instead of image: ${textPart.text.substring(0, 100)}`);
        }
      }

      // Format 2: Imagen predict format (like generateImage)
      if (!base64 && data.predictions && data.predictions[0]) {
        if (data.predictions[0].bytesBase64Encoded) {
          base64 = data.predictions[0].bytesBase64Encoded;
          console.log('✅ Found image in predictions.bytesBase64Encoded');
        } else if (data.predictions[0].imageBase64) {
          base64 = data.predictions[0].imageBase64;
          console.log('✅ Found image in predictions.imageBase64');
        }
      }

      // Format 3: Direct base64 in response
      if (!base64 && data.image) {
        base64 = data.image;
        console.log('✅ Found image in data.image');
      }

      if (!base64) {
        console.error('❌ Unexpected response format. Full response:', JSON.stringify(data, null, 2).substring(0, 1000));
        throw new Error(`No image data in response. Response keys: ${Object.keys(data).join(', ')}`);
      }

      return {
        url: `data:image/png;base64,${base64}`,
        base64,
        format: 'png',
        metadata: {
          provider: 'vertex-imagen',
          model: this.imageToImageModel,
          prompt: finalPrompt,
          type: 'recomposition',
        },
      };
    } catch (error: any) {
      console.error('Product recomposition error:', error);
      throw new Error(`Failed to recompose product: ${error.message}`);
    }
  }

  async generateUGCStyle(
    productImageBase64: string,
    personaImageBase64: string,
    prompt: string,
    options?: ImageOptions
  ): Promise<ImageResult> {
    if (!this.apiKey) {
      throw new Error('Google API key is not configured');
    }

    try {
      // Build UGC style prompt with realism keywords
      const finalPrompt = this.buildUGCPrompt(prompt);

      // For UGC, we need to combine product and persona images
      // This is complex - may need multiple steps or a model that supports multiple images
      // For now, use persona image as primary and mention product in prompt
      const url = `${this.baseUrl}/${this.imageToImageModel}:generateContent?key=${this.apiKey}`;

      const payload = {
        contents: [
          {
            parts: [
              { text: finalPrompt },
              {
                inline_data: {
                  mime_type: 'image/png',
                  data: personaImageBase64,
                },
              },
              // Note: Some models may support multiple images, but we'll use persona as primary
              // Product will be composited via prompt guidance
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Check for API not enabled error
        if (errorData.error?.code === 403 && (errorData.error?.message?.includes('not been used') || errorData.error?.message?.includes('disabled'))) {
          const activationUrl = errorData.error?.details?.[0]?.metadata?.activationUrl ||
            errorData.error?.details?.find((d: any) => d['@type']?.includes('ErrorInfo'))?.metadata?.activationUrl;

          throw new Error(
            `Generative Language API is not enabled. ` +
            `Please enable it at: ${activationUrl || 'https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com'} ` +
            `Then wait a few minutes and try again.`
          );
        }

        throw new Error(`UGC generation error: ${errorData.error?.message || JSON.stringify(errorData)}`);
      }

      const data = await response.json();

      // Log response structure for debugging
      console.log('🔍 UGC generation API response structure:', {
        hasCandidates: !!data.candidates,
        candidatesLength: data.candidates?.length || 0,
        keys: Object.keys(data),
      });

      const candidates = data.candidates;
      if (!candidates || candidates.length === 0) {
        throw new Error('No candidates returned');
      }

      const contentParts = candidates[0].content?.parts || [];

      // Try camelCase first (standard Gemini format)
      let imagePart = contentParts.find((p: any) => p.inlineData);
      let base64: string | undefined;

      if (imagePart?.inlineData?.data) {
        base64 = imagePart.inlineData.data;
        console.log('✅ Found image in inlineData (camelCase)');
      } else {
        // Try snake_case as fallback
        imagePart = contentParts.find((p: any) => p.inline_data);
        if (imagePart?.inline_data?.data) {
          base64 = imagePart.inline_data.data;
          console.log('✅ Found image in inline_data (snake_case)');
        }
      }

      if (!base64) {
        // Check if there's text instead of image
        const textPart = contentParts.find((p: any) => p.text);
        if (textPart) {
          console.warn('⚠️ Model returned text instead of image:', textPart.text.substring(0, 200));
          throw new Error(`Model returned text instead of image: ${textPart.text.substring(0, 100)}`);
        }
        console.error('❌ No image data found. Response:', JSON.stringify(data, null, 2).substring(0, 500));
        throw new Error('No image data in response');
      }

      return {
        url: `data:image/png;base64,${base64}`,
        base64,
        format: 'png',
        metadata: {
          provider: 'vertex-imagen',
          model: this.imageToImageModel,
          prompt: finalPrompt,
          type: 'ugc_style',
        },
      };
    } catch (error: any) {
      console.error('UGC generation error:', error);
      throw new Error(`Failed to generate UGC style image: ${error.message}`);
    }
  }

  /**
   * Build realism-enhanced prompt
   */
  private buildRealismPrompt(basePrompt: string, imageType: 'product_only' | 'product_persona' | 'ugc_style'): string {
    const realismKeywords = 'photorealistic, professional photography, high resolution 8k, realistic lighting, sharp details, no AI artifacts, no oversaturation, realistic shadows';

    let typeSpecificKeywords = '';
    if (imageType === 'product_only') {
      typeSpecificKeywords = 'product photography, commercial quality, realistic materials, professional studio lighting';
    } else if (imageType === 'product_persona') {
      typeSpecificKeywords = 'natural skin tone, realistic facial features, authentic expression, lifelike appearance';
    } else if (imageType === 'ugc_style') {
      typeSpecificKeywords = 'authentic candid moment, natural lighting, realistic setting, smartphone camera aesthetic, unpolished authentic look';
    }

    return `${basePrompt}, ${realismKeywords}, ${typeSpecificKeywords}`;
  }

  /**
   * Build recomposition prompt with product fidelity requirements
   */
  private buildRecompositionPrompt(scenePrompt: string, imageType: 'product_only' | 'product_persona'): string {
    const taskInstruction = 'Blend the product in the input image into the scene described below.';
    const requirements = 'IDENTITY LOCK: The product image is GROUND TRUTH. TEXTURE MAPPING: Treat the product image as a FLATTENED, IMMUTABLE TEXTURE. Do not attempt to read or understand the text. Just copy the pixels exactly. Text pixels must NOT be re-interpreted, redrawn, or stylized. Logo geometry must remain Euclidean and rigid. Font weight, kerning, and color must match original exactly. DETAIL PRIORITY: Focus on HIGH FREQUENCY DETAILS. The text and logo must be razor sharp. LIGHTING: Ensure EVEN, FRONTAL lighting on the product face to prevent shadows from obscuring text. SCALE CONTROL: The product MUST maintain a realistic human-scale proportion, but large enough to be legible. It should occupy approx 15-18% of the vertical frame height (Standard CPG shot). It must be handheld-sized, roughly the size of a large smartphone or small bottle. RIGID BODY: The product is a solid, non-deformable object; do not curve or bend labels.';

    const realismPrompt = this.buildRealismPrompt(scenePrompt, imageType);

    return `TASK: ${taskInstruction}\nREQUIREMENTS: ${requirements}\nSCENE: ${realismPrompt}\nOUTPUT: Return ONLY the generated image.`;
  }

  /**
   * Build UGC style prompt
   */
  private buildUGCPrompt(basePrompt: string): string {
    const ugcSpecific = 'Persona talking directly to camera with eye contact, holding product naturally, authentic candid moment, natural lighting, realistic setting, smartphone camera aesthetic, unpolished authentic look';
    return this.buildRealismPrompt(`${basePrompt}. ${ugcSpecific}`, 'ugc_style');
  }
}
