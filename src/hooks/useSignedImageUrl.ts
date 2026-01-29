import { useState, useEffect } from 'react';

/**
 * Hook to get a signed URL for an image
 * Automatically creates signed URL if storage_path and storage_bucket are provided
 */
export function useSignedImageUrl(
  storageUrl?: string,
  storagePath?: string,
  storageBucket?: string
): string | undefined {
  const [signedUrl, setSignedUrl] = useState<string | undefined>(storageUrl);

  useEffect(() => {
    // If we have storage_path and storage_bucket, create signed URL
    if (storagePath && storageBucket) {
      // Create signed URL regardless of the original URL format if we have explicit bucket/path
      const shouldSign = true;

      if (shouldSign) {
        // Debounce slightly to prevent rapid firing? No, just fetch
        // console.log('Fetching signed URL for:', { bucket: storageBucket, path: storagePath });
        fetch(`/api/media/signed-url?bucket=${encodeURIComponent(storageBucket)}&path=${encodeURIComponent(storagePath)}&expiresIn=3600`)
          .then((res) => {
            if (res.ok) {
              return res.json();
            }
            throw new Error('Failed to create signed URL');
          })
          .then((data) => {
            if (data.signedUrl) {
              setSignedUrl(data.signedUrl);
            }
          })
          .catch((err) => {
            console.error('Failed to create signed URL:', err);
            // Fallback to original URL
            setSignedUrl(storageUrl);
          });
      } else {
        // Not a Supabase URL, use as-is
        setSignedUrl(storageUrl);
      }
    } else {
      // No storage_path/bucket, use original URL (might fail if bucket is private)
      setSignedUrl(storageUrl);
    }
  }, [storageUrl, storagePath, storageBucket]);

  return signedUrl;
}