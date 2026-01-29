-- Migration: 014_audience_image_generation.sql
-- Add support for audience-centric product image generation

-- Create audience_image_generations table to track generation jobs
CREATE TABLE IF NOT EXISTS audience_image_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  audience_id UUID NOT NULL REFERENCES audience_segments(id) ON DELETE CASCADE,
  persona_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  config JSONB DEFAULT '{}'::jsonb,
  generated_images JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Add columns to media_assets for audience-specific metadata
ALTER TABLE media_assets 
  ADD COLUMN IF NOT EXISTS audience_id UUID REFERENCES audience_segments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS persona_name TEXT,
  ADD COLUMN IF NOT EXISTS image_type TEXT CHECK (image_type IN ('product_only', 'product_persona', 'ugc_style')),
  ADD COLUMN IF NOT EXISTS product_ids JSONB DEFAULT '[]'::jsonb;

-- Create indexes for querying by audience/persona/image_type
CREATE INDEX IF NOT EXISTS idx_audience_image_generations_project_id ON audience_image_generations(project_id);
CREATE INDEX IF NOT EXISTS idx_audience_image_generations_audience_id ON audience_image_generations(audience_id);
CREATE INDEX IF NOT EXISTS idx_audience_image_generations_status ON audience_image_generations(status);
CREATE INDEX IF NOT EXISTS idx_audience_image_generations_created_at ON audience_image_generations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_assets_audience_id ON media_assets(audience_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_persona_name ON media_assets(persona_name);
CREATE INDEX IF NOT EXISTS idx_media_assets_image_type ON media_assets(image_type);
CREATE INDEX IF NOT EXISTS idx_media_assets_product_ids ON media_assets USING GIN(product_ids);

-- Add RLS policies for audience_image_generations
ALTER TABLE audience_image_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audience image generations"
  ON audience_image_generations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = audience_image_generations.project_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own audience image generations"
  ON audience_image_generations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = audience_image_generations.project_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own audience image generations"
  ON audience_image_generations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = audience_image_generations.project_id
      AND p.user_id = auth.uid()
    )
  );
