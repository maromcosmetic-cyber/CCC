-- Create Supabase Storage buckets

-- Scraped content bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'scraped-content',
  'scraped-content',
  false,
  10485760, -- 10MB
  ARRAY['text/html', 'text/plain', 'application/json', 'text/css', 'application/javascript']
)
ON CONFLICT (id) DO NOTHING;

-- Media assets bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media-assets',
  'media-assets',
  false,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Generated assets bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-assets',
  'generated-assets',
  false,
  104857600, -- 100MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- UGC videos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ugc-videos',
  'ugc-videos',
  false,
  524288000, -- 500MB
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Company profile artifacts bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-profile-artifacts',
  'company-profile-artifacts',
  false,
  10485760, -- 10MB
  ARRAY['application/json', 'text/plain', 'text/html']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies

-- Policy: Users can view files from their projects
CREATE POLICY "Users can view files from their projects"
ON storage.objects FOR SELECT
USING (
  bucket_id IN ('scraped-content', 'media-assets', 'generated-assets', 'ugc-videos', 'company-profile-artifacts')
  AND (
    -- Check if user owns the project (folder structure: {project_id}/...)
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.user_id = auth.uid()
      AND (storage.foldername(name))[1] = p.id::text
    )
    -- Or file is marked as public
    OR (metadata->>'is_public')::boolean = true
  )
);

-- Policy: Bot service role can read all files (for customer service queries)
CREATE POLICY "Bot service role can read all files"
ON storage.objects FOR SELECT
TO service_role
USING (
  bucket_id IN ('scraped-content', 'media-assets', 'generated-assets', 'ugc-videos', 'company-profile-artifacts')
);

-- Policy: Users can upload files to their projects
CREATE POLICY "Users can upload files to their projects"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id IN ('scraped-content', 'media-assets', 'generated-assets', 'ugc-videos', 'company-profile-artifacts')
  AND (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.user_id = auth.uid()
      AND (storage.foldername(name))[1] = p.id::text
    )
  )
);

-- Policy: Service role can upload files (for workers)
CREATE POLICY "Service role can upload files"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (
  bucket_id IN ('scraped-content', 'media-assets', 'generated-assets', 'ugc-videos', 'company-profile-artifacts')
);

-- Policy: Users can update files in their projects
CREATE POLICY "Users can update files in their projects"
ON storage.objects FOR UPDATE
USING (
  bucket_id IN ('scraped-content', 'media-assets', 'generated-assets', 'ugc-videos', 'company-profile-artifacts')
  AND (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.user_id = auth.uid()
      AND (storage.foldername(name))[1] = p.id::text
    )
  )
);

-- Policy: Service role can update files
CREATE POLICY "Service role can update files"
ON storage.objects FOR UPDATE
TO service_role
USING (
  bucket_id IN ('scraped-content', 'media-assets', 'generated-assets', 'ugc-videos', 'company-profile-artifacts')
);

-- Policy: Users can delete files from their projects
CREATE POLICY "Users can delete files from their projects"
ON storage.objects FOR DELETE
USING (
  bucket_id IN ('scraped-content', 'media-assets', 'generated-assets', 'ugc-videos', 'company-profile-artifacts')
  AND (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.user_id = auth.uid()
      AND (storage.foldername(name))[1] = p.id::text
    )
  )
);

-- Policy: Service role can delete files
CREATE POLICY "Service role can delete files"
ON storage.objects FOR DELETE
TO service_role
USING (
  bucket_id IN ('scraped-content', 'media-assets', 'generated-assets', 'ugc-videos', 'company-profile-artifacts')
);

