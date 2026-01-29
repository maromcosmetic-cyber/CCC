-- Migration: 015_image_ads_system.sql
-- Add support for Image Ads workflow: Intelligence → Visual Guidelines → Templates → Ads

-- 1. Ad Visual Guidelines Table
-- Stores market-derived visual guidelines per project/category
CREATE TABLE IF NOT EXISTS ad_visual_guidelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Category for which guidelines apply (e.g., "cosmetics", "fitness")
  category TEXT NOT NULL,
  
  -- Visual rules extracted from competitor ads
  guideline_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- How brand rules override market rules
  brand_alignment_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one guideline per project/category combination
  UNIQUE(project_id, category)
);

-- 2. Ad Templates Table
-- Stores reusable ad layout templates that encode visual guidelines
CREATE TABLE IF NOT EXISTS ad_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  guideline_id UUID REFERENCES ad_visual_guidelines(id) ON DELETE SET NULL,
  
  -- Template metadata
  name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('static_image', 'carousel', 'video_thumbnail')),
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'tiktok', 'instagram', 'facebook')),
  
  -- Layout structure: zones, text areas, image areas, CTA position
  layout_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Style rules: colors, fonts, spacing
  style_rules_json JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Generated Ads Table
-- Stores final generated ads
CREATE TABLE IF NOT EXISTS generated_ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES ad_templates(id) ON DELETE CASCADE,
  audience_segment_id UUID REFERENCES audience_segments(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  
  -- Ad type
  ad_type TEXT NOT NULL CHECK (ad_type IN ('image', 'carousel', 'video')),
  
  -- Ad assets: image URLs, copy, headlines
  assets_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Platform specs, dimensions, file format
  metadata_json JSONB DEFAULT '{}'::jsonb,
  
  -- Status workflow
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ad_visual_guidelines_project_id ON ad_visual_guidelines(project_id);
CREATE INDEX IF NOT EXISTS idx_ad_visual_guidelines_category ON ad_visual_guidelines(category);
CREATE INDEX IF NOT EXISTS idx_ad_templates_project_id ON ad_templates(project_id);
CREATE INDEX IF NOT EXISTS idx_ad_templates_guideline_id ON ad_templates(guideline_id);
CREATE INDEX IF NOT EXISTS idx_ad_templates_platform ON ad_templates(platform);
CREATE INDEX IF NOT EXISTS idx_ad_templates_type ON ad_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_generated_ads_project_id ON generated_ads(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_ads_template_id ON generated_ads(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_ads_audience_segment_id ON generated_ads(audience_segment_id);
CREATE INDEX IF NOT EXISTS idx_generated_ads_product_id ON generated_ads(product_id);
CREATE INDEX IF NOT EXISTS idx_generated_ads_status ON generated_ads(status);
CREATE INDEX IF NOT EXISTS idx_generated_ads_created_at ON generated_ads(created_at DESC);

-- Enable RLS
ALTER TABLE ad_visual_guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_ads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ad_visual_guidelines
CREATE POLICY "Users can view visual guidelines for their projects"
  ON ad_visual_guidelines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = ad_visual_guidelines.project_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert visual guidelines for their projects"
  ON ad_visual_guidelines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = ad_visual_guidelines.project_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update visual guidelines for their projects"
  ON ad_visual_guidelines FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = ad_visual_guidelines.project_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete visual guidelines for their projects"
  ON ad_visual_guidelines FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = ad_visual_guidelines.project_id
      AND p.user_id = auth.uid()
    )
  );

-- RLS Policies for ad_templates
CREATE POLICY "Users can view templates for their projects"
  ON ad_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = ad_templates.project_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert templates for their projects"
  ON ad_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = ad_templates.project_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update templates for their projects"
  ON ad_templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = ad_templates.project_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete templates for their projects"
  ON ad_templates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = ad_templates.project_id
      AND p.user_id = auth.uid()
    )
  );

-- RLS Policies for generated_ads
CREATE POLICY "Users can view generated ads for their projects"
  ON generated_ads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = generated_ads.project_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert generated ads for their projects"
  ON generated_ads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = generated_ads.project_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update generated ads for their projects"
  ON generated_ads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = generated_ads.project_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete generated ads for their projects"
  ON generated_ads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = generated_ads.project_id
      AND p.user_id = auth.uid()
    )
  );

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_ad_visual_guidelines_updated_at
  BEFORE UPDATE ON ad_visual_guidelines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_templates_updated_at
  BEFORE UPDATE ON ad_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_ads_updated_at
  BEFORE UPDATE ON generated_ads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
