// Vision Provider Interface (Google Vision API)

export interface ProductIsolationResult {
  isolated_image: string; // Base64 encoded image with transparent background
  mask: string; // Base64 encoded alpha mask
  bounding_box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface VisionProvider {
  /**
   * Isolate product from background
   * Detects primary product object, generates alpha mask, removes background
   * while preserving edges, labels, text, proportions
   */
  isolateProduct(imageUrl: string, options?: ProductIsolationOptions): Promise<ProductIsolationResult>;

  /**
   * Detect objects in an image
   * Returns a list of detected objects with their bounding boxes and confidence scores
   */
  detectObjects(imageUrl: string): Promise<DetectedObject[]>;

  analyzeImage(imageUrl: string): Promise<{
    safe_zones: string[];
    dominant_colors: string[];
    contrast: string;
    visual_noise: string;
    text_placement_suggestion: string;
    labels?: string[];
  }>;
}

export interface DetectedObject {
  name: string;
  confidence: number;
  vertices: { x: number; y: number }[]; // Normalized coordinates (0-1)
}

export interface ProductIsolationOptions {
  preserve_edges?: boolean;
  preserve_text?: boolean;
  confidence_threshold?: number;
  real_isolation?: boolean;
}
