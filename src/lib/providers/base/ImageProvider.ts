// Image Provider Interface

export interface ImageResult {
  url: string;
  storage_path?: string;
  width?: number;
  height?: number;
  format?: string;
  metadata?: Record<string, any>;
  base64?: string; // Base64 encoded image for direct use
}

export interface ImageProvider {
  generateBackground(location: string): Promise<ImageResult>;
  generateImage(prompt: string, options?: ImageOptions): Promise<ImageResult>;
  refineImage?(base64Image: string, prompt: string, options?: ImageOptions): Promise<ImageResult>; // Optional refinement
  recomposeProduct?(productImageBase64: string, scenePrompt: string, options?: ImageOptions): Promise<ImageResult>;
  generateUGCStyle?(productImageBase64: string, personaImageBase64: string, prompt: string, options?: ImageOptions): Promise<ImageResult>;
}

export interface ImageOptions {
  width?: number;
  height?: number;
  style?: string;
  quality?: 'standard' | 'hd';
  aspectRatio?: '1:1' | '4:5' | '16:9' | '9:16';
  realismKeywords?: boolean; // Whether to append realism keywords
  negativePrompt?: string; // Things to avoid (e.g. text, blurring)
  model?: string; // Model to use for generation
  referenceImage?: string; // Base64 of reference image (for character consistency) - SINGLE (Deprecated)
  referenceImages?: (string | { base64: string, mimeType: string })[]; // Array of Base64 or Typed Images
  temperature?: number; // Creativity vs Strictness (0.0 - 1.0)
  strength?: number; // Refinement strength (0.0 - 1.0)
}


