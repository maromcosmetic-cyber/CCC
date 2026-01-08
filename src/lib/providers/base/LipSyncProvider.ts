// Lip-Sync Provider Interface

export interface LipSyncResult {
  url: string;
  storage_path?: string;
  duration_seconds?: number;
  metadata?: Record<string, any>;
}

export interface LipSyncProvider {
  syncLips(
    videoUrl: string,
    audioUrl: string,
    options?: LipSyncOptions
  ): Promise<LipSyncResult>;
}

export interface LipSyncOptions {
  quality?: 'low' | 'medium' | 'high';
  preserve_audio?: boolean;
}


