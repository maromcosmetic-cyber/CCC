// Enhancement Provider Interface (Freepik API)

export interface EnhancementResult {
  enhanced_image: string; // Base64 encoded enhanced image
  original_image: string; // Base64 encoded original image (fallback)
  scale_factor?: number;
  enhancement_type?: 'upscale' | 'skin_enhancement' | 'general' | 'background-removal';
  metadata?: Record<string, any>;
}

export interface EnhancementProvider {
  /**
   * Upscale an image
   * @param imageBase64 Base64 encoded image
   * @param scaleFactor 2x or 4x upscaling
   * @returns Enhanced image base64
   */
  upscaleImage(imageBase64: string, scaleFactor?: 2 | 4): Promise<EnhancementResult>;

  /**
   * Enhance image quality (skin enhancement for personas, general enhancement)
   * @param imageBase64 Base64 encoded image
   * @param enhancementType Type of enhancement
   * @returns Enhanced image base64
   */
  enhanceImage?(imageBase64: string, enhancementType?: 'skin' | 'general'): Promise<EnhancementResult>;
}
