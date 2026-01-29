import { EnhancementProvider, EnhancementResult } from '../base/EnhancementProvider';

/**
 * Freepik API Provider for Image Enhancement and Upscaling
 * 
 * Uses Freepik API for:
 * - Image upscaling (2x, 4x)
 * - Skin enhancement (if available)
 * 
 * Note: Freepik API may return async task IDs that require polling
 */
export class FreepikProvider implements EnhancementProvider {
  private apiKey?: string;
  private baseUrl = 'https://api.freepik.com/v1';
  private pollInterval = 2000; // 2 seconds
  private maxPollAttempts = 150; // 5 minutes max (150 * 2s = 300s)

  constructor() {
    // Platform-managed: Use platform credentials from env vars
    this.apiKey = process.env.FREEPIK_API_KEY;
  }

  async upscaleImage(imageBase64: string, scaleFactor: 2 | 4 = 2): Promise<EnhancementResult> {
    if (!this.apiKey) {
      console.warn('⚠️ FREEPIK_API_KEY not configured, returning original image');
      return {
        enhanced_image: imageBase64,
        original_image: imageBase64,
        scale_factor: 1,
        enhancement_type: 'upscale',
        metadata: { error: 'API key not configured' },
      };
    }

    try {
      console.log(`✨ Calling Freepik Upscale API (${scaleFactor}x)...`);

      const response = await fetch(`${this.baseUrl}/ai/upscale`, {
        method: 'POST',
        headers: {
          'x-freepik-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: {
            base64: imageBase64,
          },
          scale_factor: scaleFactor,
          optimized_for: 'quality', // Prioritize quality over speed
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn('⚠️ Freepik Upscale API Error:', JSON.stringify(errorData));
        // Return original on error
        return {
          enhanced_image: imageBase64,
          original_image: imageBase64,
          scale_factor: 1,
          enhancement_type: 'upscale',
          metadata: { error: errorData },
        };
      }

      const data = await response.json();

      // Check if async task (task ID returned)
      if (data && data.data && data.data.id) {
        const taskId = data.data.id;
        console.log(`⚠️ Freepik started async task ${taskId}, polling for completion...`);

        // Poll for completion
        const enhancedImage = await this.pollTaskCompletion(taskId, imageBase64);

        return {
          enhanced_image: enhancedImage,
          original_image: imageBase64,
          scale_factor: scaleFactor,
          enhancement_type: 'upscale',
          metadata: { task_id: taskId },
        };
      }

      // Check if direct image returned (synchronous response)
      if (data && data.data && data.data.base64) {
        return {
          enhanced_image: data.data.base64,
          original_image: imageBase64,
          scale_factor: scaleFactor,
          enhancement_type: 'upscale',
          metadata: { synchronous: true },
        };
      }

      // If image URL returned instead of base64
      if (data && data.data && data.data.url) {
        // Fetch the image and convert to base64
        const imageResponse = await fetch(data.data.url);
        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const enhancedBase64 = buffer.toString('base64');

        return {
          enhanced_image: enhancedBase64,
          original_image: imageBase64,
          scale_factor: scaleFactor,
          enhancement_type: 'upscale',
          metadata: { url: data.data.url },
        };
      }

      // Unknown response format - return original
      console.warn('⚠️ Unknown Freepik response format:', JSON.stringify(data));
      return {
        enhanced_image: imageBase64,
        original_image: imageBase64,
        scale_factor: 1,
        enhancement_type: 'upscale',
        metadata: { error: 'Unknown response format', response: data },
      };
    } catch (error: any) {
      console.warn('⚠️ Freepik Enhancement Failed:', error.message);
      // Return original on error (don't fail the pipeline)
      return {
        enhanced_image: imageBase64,
        original_image: imageBase64,
        scale_factor: 1,
        enhancement_type: 'upscale',
        metadata: { error: error.message },
      };
    }
  }

  async enhanceImage(imageBase64: string, enhancementType: 'skin' | 'general' = 'general'): Promise<EnhancementResult> {
    if (!this.apiKey) {
      console.warn('⚠️ FREEPIK_API_KEY not configured, returning original image');
      return {
        enhanced_image: imageBase64,
        original_image: imageBase64,
        enhancement_type: enhancementType,
        metadata: { error: 'API key not configured' },
      };
    }

    // Check if skin enhancement endpoint exists
    // For now, return original as skin enhancement endpoint may not be available
    // TODO: Implement when Freepik API documentation confirms endpoint availability
    console.warn('⚠️ Skin enhancement endpoint not yet implemented, returning original');
    return {
      enhanced_image: imageBase64,
      original_image: imageBase64,
      enhancement_type: enhancementType,
      metadata: { note: 'Not yet implemented' },
    };
  }

  /**
   * Remove background from image (creates transparent PNG)
   * Uses Freepik's background removal API
   */
  async removeBackground(imageBase64: string): Promise<EnhancementResult> {
    if (!this.apiKey) {
      console.warn('⚠️ FREEPIK_API_KEY not configured, returning original image');
      return {
        enhanced_image: imageBase64,
        original_image: imageBase64,
        enhancement_type: 'background-removal',
        metadata: { error: 'API key not configured' },
      };
    }

    try {
      console.log(`✂️ Calling Freepik Background Removal API...`);

      // Freepik uses the "ai/image-editing" or "ai/retouch" endpoint for BG removal
      // The exact endpoint may vary - trying the documented "retouch" with mode
      const response = await fetch(`${this.baseUrl}/ai/retouch`, {
        method: 'POST',
        headers: {
          'x-freepik-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: {
            base64: imageBase64,
          },
          mode: 'background-removal', // Request transparent background
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn('⚠️ Freepik BG Removal API Error:', JSON.stringify(errorData));
        // Return original on error
        return {
          enhanced_image: imageBase64,
          original_image: imageBase64,
          enhancement_type: 'background-removal',
          metadata: { error: errorData },
        };
      }

      const data = await response.json();

      // Check if async task (task ID returned)
      if (data && data.data && data.data.id) {
        const taskId = data.data.id;
        console.log(`⏳ Freepik started async BG removal task ${taskId}, polling...`);
        const enhancedImage = await this.pollTaskCompletion(taskId, imageBase64);
        return {
          enhanced_image: enhancedImage,
          original_image: imageBase64,
          enhancement_type: 'background-removal',
          metadata: { task_id: taskId },
        };
      }

      // Check if direct image returned
      if (data && data.data && data.data.base64) {
        return {
          enhanced_image: data.data.base64,
          original_image: imageBase64,
          enhancement_type: 'background-removal',
          metadata: { synchronous: true },
        };
      }

      // If URL returned
      if (data && data.data && data.data.url) {
        const imageResponse = await fetch(data.data.url);
        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return {
          enhanced_image: buffer.toString('base64'),
          original_image: imageBase64,
          enhancement_type: 'background-removal',
          metadata: { url: data.data.url },
        };
      }

      console.warn('⚠️ Unknown Freepik BG removal response:', JSON.stringify(data));
      return {
        enhanced_image: imageBase64,
        original_image: imageBase64,
        enhancement_type: 'background-removal',
        metadata: { error: 'Unknown response format' },
      };
    } catch (error: any) {
      console.warn('⚠️ Freepik BG Removal Failed:', error.message);
      return {
        enhanced_image: imageBase64,
        original_image: imageBase64,
        enhancement_type: 'background-removal',
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Poll for async task completion
   */
  private async pollTaskCompletion(taskId: string, originalImageBase64: string): Promise<string> {
    for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
      try {
        await new Promise((resolve) => setTimeout(resolve, this.pollInterval));

        const response = await fetch(`${this.baseUrl}/ai/tasks/${taskId}`, {
          method: 'GET',
          headers: {
            'x-freepik-api-key': this.apiKey!,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.warn(`⚠️ Polling error (attempt ${attempt + 1}):`, response.statusText);
          continue;
        }

        const data = await response.json();

        // Check if task is completed
        if (data.status === 'completed' || data.data?.status === 'completed') {
          // Get enhanced image
          if (data.data?.base64) {
            return data.data.base64;
          }
          if (data.data?.url) {
            // Fetch the image
            const imageResponse = await fetch(data.data.url);
            const arrayBuffer = await imageResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            return buffer.toString('base64');
          }
        }

        // Check if task failed
        if (data.status === 'failed' || data.data?.status === 'failed') {
          console.warn('⚠️ Freepik task failed:', data.error || data.data?.error);
          return originalImageBase64; // Return original on failure
        }

        // Task still processing, continue polling
        if (attempt % 10 === 0) {
          console.log(`⏳ Freepik task ${taskId} still processing... (attempt ${attempt + 1}/${this.maxPollAttempts})`);
        }
      } catch (error: any) {
        console.warn(`⚠️ Polling error (attempt ${attempt + 1}):`, error.message);
        if (attempt === this.maxPollAttempts - 1) {
          // Last attempt failed, return original
          return originalImageBase64;
        }
      }
    }

    // Timeout - return original
    console.warn(`⚠️ Freepik task ${taskId} timed out after ${this.maxPollAttempts} attempts, returning original`);
    return originalImageBase64;
  }
}
