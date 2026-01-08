// Image Provider Interface

export interface ImageResult {
  url: string;
  storage_path?: string;
  width?: number;
  height?: number;
  format?: string;
  metadata?: Record<string, any>;
}

export interface ImageProvider {
  generateBackground(location: string): Promise<ImageResult>;
  generateImage(prompt: string, options?: ImageOptions): Promise<ImageResult>;
}

export interface ImageOptions {
  width?: number;
  height?: number;
  style?: string;
  quality?: number;
}


