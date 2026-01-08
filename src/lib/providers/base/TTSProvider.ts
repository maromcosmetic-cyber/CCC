// Text-to-Speech Provider Interface

export interface AudioResult {
  url: string;
  storage_path?: string;
  duration_seconds?: number;
  format?: string;
  sample_rate?: number;
  metadata?: Record<string, any>;
}

export interface TTSOptions {
  voice_id: string;
  speed?: number;
  pitch?: number;
  stability?: number;
  similarity_boost?: number;
}

export interface TTSProvider {
  generateSpeech(
    text: string,
    options: TTSOptions
  ): Promise<AudioResult>;
  
  listVoices(): Promise<Array<{ id: string; name: string; description?: string }>>;
}


