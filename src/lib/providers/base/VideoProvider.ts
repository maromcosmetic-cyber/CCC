// Video Provider Interface

export interface VideoResult {
  url: string;
  storage_path?: string;
  duration_seconds?: number;
  width?: number;
  height?: number;
  format?: string;
  metadata?: Record<string, any>;
}

export interface Character {
  id: string;
  name: string;
  image_path?: string;
  character_data?: Record<string, any>;
}

export interface VideoProvider {
  generateCharacterVideo(
    character: Character,
    script: string,
    options?: VideoOptions
  ): Promise<VideoResult>;
}

export interface VideoOptions {
  duration_seconds?: number;
  resolution?: {
    width: number;
    height: number;
  };
  style?: string;
}


