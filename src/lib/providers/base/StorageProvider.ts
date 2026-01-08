// Storage Provider Interface (Supabase Storage)

export interface StorageResult {
  path: string;
  url: string;
  bucket: string;
  publicUrl?: string;
}

export interface UploadOptions {
  contentType?: string;
  cacheControl?: string;
  upsert?: boolean;
  metadata?: Record<string, string>;
}

export interface StorageProvider {
  uploadFile(
    file: File | Buffer | Uint8Array,
    bucket: string,
    path: string,
    options?: UploadOptions
  ): Promise<StorageResult>;
  
  getPublicUrl(bucket: string, path: string): string;
  
  createSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number
  ): Promise<string>;
  
  deleteFile(bucket: string, path: string): Promise<void>;
  
  listFiles(
    bucket: string,
    folder?: string,
    options?: { limit?: number; offset?: number }
  ): Promise<Array<{ name: string; id: string; updated_at: string }>>;
}


