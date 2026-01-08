// Background Removal Provider Interface

export interface ImageResult {
  url: string;
  storage_path?: string;
  width?: number;
  height?: number;
  format?: string;
  metadata?: Record<string, any>;
}

export interface BackgroundRemovalProvider {
  removeBackground(
    imageUrl: string,
    options?: BackgroundRemovalOptions
  ): Promise<ImageResult>;
}

export interface BackgroundRemovalOptions {
  format?: 'png' | 'jpg';
  quality?: number;
  alpha_matting?: boolean;
}


