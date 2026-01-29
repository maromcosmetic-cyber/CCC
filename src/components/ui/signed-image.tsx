'use client';

import { useState, useEffect } from 'react';
import { useSignedImageUrl } from '@/hooks/useSignedImageUrl';

interface SignedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  storageUrl?: string;
  storagePath?: string;
  storageBucket?: string;
  fallbackSrc?: string;
  signedUrl?: string;
}

/**
 * Image component that automatically uses signed URLs for Supabase storage
 */
export function SignedImage({
  storageUrl,
  storagePath,
  storageBucket,
  fallbackSrc = '/placeholder-image.png',
  src,
  alt,
  signedUrl: preSignedUrl,
  ...props
}: SignedImageProps) {
  // Use signed URL if storage info is provided, otherwise use src prop
  // If preSignedUrl is provided, we skip the hook by passing undefined as storageUrl
  const hookSignedUrl = useSignedImageUrl(preSignedUrl ? undefined : (storageUrl || src), storagePath, storageBucket);

  // Bug fix: use hookSignedUrl if available, regardless of storageUrl presence
  const imageUrl = preSignedUrl || hookSignedUrl || storageUrl || src;
  const [imgSrc, setImgSrc] = useState<string | undefined>(imageUrl);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Debug logging
    console.log('[SignedImage Debug]', {
      promptProps: { preSignedUrl, storageUrl, storagePath, storageBucket },
      hookResult: hookSignedUrl,
      finalUrl: imageUrl
    });

    if (imageUrl) {
      setImgSrc(imageUrl);
      setHasError(false);
    }
  }, [imageUrl, hookSignedUrl, preSignedUrl, storageUrl, storagePath, storageBucket]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      if (fallbackSrc) {
        setImgSrc(fallbackSrc);
      }
    }
  };

  if (!imgSrc) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt || 'Image'}
      onError={handleError}
      {...props}
    />
  );
}