import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StorageProvider, StorageResult, UploadOptions } from '../base/StorageProvider';

/**
 * Supabase Storage Implementation
 * 
 * This is a REAL implementation (not a stub) that uses Supabase Storage API
 * for all file operations.
 */
export class SupabaseStorage implements StorageProvider {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and key must be provided');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async uploadFile(
    file: File | Buffer | Uint8Array,
    bucket: string,
    path: string,
    options?: UploadOptions
  ): Promise<StorageResult> {
    try {
      let fileData: File | Blob;
      
      // Determine content type
      let contentType = options?.contentType;
      
      // If no contentType provided, try to infer from path or default to image/png for image uploads
      if (!contentType) {
        const extension = path.split('.').pop()?.toLowerCase();
        const mimeTypes: Record<string, string> = {
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'webp': 'image/webp',
          'gif': 'image/gif',
          'mp4': 'video/mp4',
          'webm': 'video/webm',
          'html': 'text/html',
          'json': 'application/json',
          'pdf': 'application/pdf',
        };
        contentType = mimeTypes[extension || ''] || 'application/octet-stream';
      }
      
      if (file instanceof File) {
        fileData = file;
        // Use file's MIME type if no contentType was provided
        if (!contentType || contentType === 'application/octet-stream') {
          contentType = file.type || contentType;
        }
      } else if (Buffer.isBuffer(file)) {
        // Create Blob with explicit MIME type
        fileData = new Blob([file], { type: contentType || 'application/octet-stream' });
      } else {
        // Create Blob with explicit MIME type
        fileData = new Blob([file], { type: contentType || 'application/octet-stream' });
      }

      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(path, fileData, {
          contentType: contentType,
          cacheControl: options?.cacheControl || '3600',
          upsert: options?.upsert || false,
          metadata: options?.metadata,
        });

      if (error) {
        throw new Error(`Failed to upload file: ${error.message}`);
      }

      const publicUrl = this.getPublicUrl(bucket, path);
      
      return {
        path: data.path,
        url: publicUrl,
        bucket,
        publicUrl,
      };
    } catch (error) {
      throw new Error(`Storage upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async createSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        throw new Error(`Failed to create signed URL: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      throw new Error(`Failed to create signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    try {
      const { error } = await this.supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        throw new Error(`Failed to delete file: ${error.message}`);
      }
    } catch (error) {
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listFiles(
    bucket: string,
    folder?: string,
    options?: { limit?: number; offset?: number }
  ): Promise<Array<{ name: string; id: string; updated_at: string }>> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .list(folder, {
          limit: options?.limit || 100,
          offset: options?.offset || 0,
          sortBy: { column: 'updated_at', order: 'desc' },
        });

      if (error) {
        throw new Error(`Failed to list files: ${error.message}`);
      }

      return (data || []).map((file) => ({
        name: file.name,
        id: file.id || file.name,
        updated_at: file.updated_at || new Date().toISOString(),
      }));
    } catch (error) {
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}


