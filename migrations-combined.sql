
> ccc-ecommerce-command-center@0.1.0 db:migrate:print
> tsx scripts/print-migrations.ts

-- ============================================
-- CCC Database Migrations
-- Copy everything below and paste into Supabase SQL Editor
-- ============================================

-- ============================================
-- Migration: 001_initial_schema.sql
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  monthly_budget_amount DECIMAL(12, 2) NOT NULL,
  monthly_budget_currency TEXT NOT NULL DEFAULT 'USD',
  target_regions JSONB DEFAULT '[]'::jsonb,
  languages JSONB DEFAULT '[]'::jsonb,
  primary_channels JSONB DEFAULT '[]'::jsonb,
  industry TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scrape runs table
CREATE TABLE scrape_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scrape pages table
CREATE TABLE scrape_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scrape_run_id UUID NOT NULL REFERENCES scrape_runs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  content TEXT,
  html_content TEXT,
  page_type TEXT CHECK (page_type IN ('home', 'product', 'legal', 'about', 'contact', 'other')),
  evidence_snippets JSONB DEFAULT '[]'::jsonb,
  storage_path TEXT, -- Path in Supabase Storage
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Company profiles table
CREATE TABLE company_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES auth.users(id),
  profile_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_refs JSONB DEFAULT '[]'::jsonb,
  storage_path TEXT, -- Path in Supabase Storage for raw artifacts
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_id TEXT, -- WooCommerce product ID
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(12, 2),
  currency TEXT DEFAULT 'USD',
  stock_status TEXT CHECK (stock_status IN ('in_stock', 'out_of_stock', 'on_backorder')),
  images JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product versions table
CREATE TABLE product_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audience segments table
CREATE TABLE audience_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  description TEXT,
  company_profile_version_id UUID REFERENCES company_profiles(id),
  user_prompt TEXT,
  ai_enhanced_prompt TEXT,
  targeting JSONB DEFAULT '{}'::jsonb,
  platform_specific_configs JSONB DEFAULT '{}'::jsonb,
  ai_suggested BOOLEAN DEFAULT false,
  evidence_refs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Campaigns table
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'google_ads', 'lazada', 'tiktok')),
  name TEXT NOT NULL,
  description TEXT,
  external_campaign_id TEXT, -- Platform-specific ID
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  budget_amount DECIMAL(12, 2),
  budget_currency TEXT DEFAULT 'USD',
  targeting_config JSONB DEFAULT '{}'::jsonb,
  creative_kit_id UUID,
  product_id UUID REFERENCES products(id),
  start_date DATE,
  end_date DATE,
  insights_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ
);

-- Presenters table
CREATE TABLE presenters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  description TEXT,
  audience_segment_id UUID REFERENCES audience_segments(id),
  voice_attributes JSONB DEFAULT '{}'::jsonb,
  example_posts JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Strategies table
CREATE TABLE strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  company_profile_version_id UUID REFERENCES company_profiles(id),
  strategy_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_refs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Calendar versions table
CREATE TABLE calendar_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  strategy_version_id UUID REFERENCES strategies(id),
  weeks INTEGER NOT NULL DEFAULT 4,
  start_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Calendar posts table
CREATE TABLE calendar_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calendar_version_id UUID NOT NULL REFERENCES calendar_versions(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  presenter_id UUID REFERENCES presenters(id),
  post_data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Creative kits table
CREATE TABLE creative_kits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  campaign_id UUID REFERENCES campaigns(id),
  product_id UUID REFERENCES products(id),
  audience_segment_id UUID REFERENCES audience_segments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kit items table
CREATE TABLE kit_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kit_id UUID NOT NULL REFERENCES creative_kits(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES media_assets(id),
  item_type TEXT NOT NULL CHECK (item_type IN ('image', 'video', 'copy', 'script')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Media assets table
CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  storage_url TEXT,
  is_public BOOLEAN DEFAULT false,
  prompt_lineage JSONB DEFAULT '{}'::jsonb,
  provider_call_id UUID,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- UGC videos table
CREATE TABLE ugc_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  character_id UUID,
  location_text TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  script_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  storage_path TEXT,
  storage_url TEXT,
  video_duration_seconds INTEGER,
  generation_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Characters table
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  character_image_path TEXT,
  character_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Video generation jobs table
CREATE TABLE video_generation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ugc_video_id UUID NOT NULL REFERENCES ugc_videos(id) ON DELETE CASCADE,
  step TEXT NOT NULL CHECK (step IN ('background_gen', 'character_video', 'tts', 'lip_sync', 'composite', 'upload')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  input_data JSONB DEFAULT '{}'::jsonb,
  output_data JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Integrations table
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('meta', 'google_ads', 'lazada', 'tiktok', 'woocommerce', 'whatsapp', 'firecrawl', 'llm', 'image', 'video', 'elevenlabs', 'synclabs')),
  credentials_encrypted TEXT,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
  last_sync_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Integration status table
CREATE TABLE integration_status (
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  message TEXT,
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (integration_id)
);

-- Prompt templates table
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  variables JSONB DEFAULT '[]'::jsonb,
  json_schema JSONB NOT NULL,
  template_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, version)
);

-- Prompt runs table
CREATE TABLE prompt_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES prompt_templates(id),
  inputs JSONB NOT NULL,
  outputs JSONB,
  tokens_used INTEGER,
  cost DECIMAL(12, 6),
  latency_ms INTEGER,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Job runs table
CREATE TABLE job_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  job_data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  logs JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cost ledger table
CREATE TABLE cost_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL,
  provider_call_id UUID,
  cost_amount DECIMAL(12, 6) NOT NULL,
  cost_currency TEXT NOT NULL DEFAULT 'USD',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_id UUID,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'whatsapp', 'worker')),
  source TEXT NOT NULL CHECK (source IN ('ui', 'whatsapp', 'worker')),
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);




-- ============================================
-- Migration: 002_indexes_rls.sql
-- ============================================

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_scrape_runs_project_id ON scrape_runs(project_id);
CREATE INDEX idx_scrape_runs_status ON scrape_runs(status);
CREATE INDEX idx_scrape_pages_scrape_run_id ON scrape_pages(scrape_run_id);
CREATE INDEX idx_company_profiles_project_id ON company_profiles(project_id);
CREATE INDEX idx_company_profiles_locked_at ON company_profiles(locked_at) WHERE locked_at IS NOT NULL;
CREATE INDEX idx_products_project_id ON products(project_id);
CREATE INDEX idx_products_source_id ON products(source_id) WHERE source_id IS NOT NULL;
CREATE INDEX idx_audience_segments_project_id ON audience_segments(project_id);
CREATE INDEX idx_campaigns_project_id ON campaigns(project_id);
CREATE INDEX idx_campaigns_platform ON campaigns(platform);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_media_assets_project_id ON media_assets(project_id);
CREATE INDEX idx_media_assets_storage_bucket ON media_assets(storage_bucket);
CREATE INDEX idx_ugc_videos_project_id ON ugc_videos(project_id);
CREATE INDEX idx_ugc_videos_status ON ugc_videos(status);
CREATE INDEX idx_integrations_project_id ON integrations(project_id);
CREATE INDEX idx_integrations_provider_type ON integrations(provider_type);
CREATE INDEX idx_prompt_runs_project_id ON prompt_runs(project_id);
CREATE INDEX idx_job_runs_project_id ON job_runs(project_id);
CREATE INDEX idx_job_runs_status ON job_runs(status);
CREATE INDEX idx_cost_ledger_project_id ON cost_ledger(project_id);
CREATE INDEX idx_audit_log_project_id ON audit_log(project_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- Full-text search indexes
CREATE INDEX idx_scrape_pages_content_search ON scrape_pages USING gin(to_tsvector('english', content));
CREATE INDEX idx_products_name_search ON products USING gin(to_tsvector('english', name));

-- RLS Policies

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE presenters ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE kit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ugc_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- Helper function to check project ownership
CREATE OR REPLACE FUNCTION user_owns_project(project_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Scrape runs policies
CREATE POLICY "Users can view scrape runs for their projects"
  ON scrape_runs FOR SELECT
  USING (user_owns_project(project_id));

CREATE POLICY "Users can create scrape runs for their projects"
  ON scrape_runs FOR INSERT
  WITH CHECK (user_owns_project(project_id));

-- Scrape pages policies
CREATE POLICY "Users can view scrape pages for their projects"
  ON scrape_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scrape_runs sr
      JOIN projects p ON sr.project_id = p.id
      WHERE sr.id = scrape_pages.scrape_run_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create scrape pages for their projects"
  ON scrape_pages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM scrape_runs sr
      JOIN projects p ON sr.project_id = p.id
      WHERE sr.id = scrape_pages.scrape_run_id
      AND p.user_id = auth.uid()
    )
  );

-- Company profiles policies
CREATE POLICY "Users can view company profiles for their projects"
  ON company_profiles FOR SELECT
  USING (user_owns_project(project_id));

CREATE POLICY "Users can create company profiles for their projects"
  ON company_profiles FOR INSERT
  WITH CHECK (user_owns_project(project_id));

CREATE POLICY "Users can update company profiles for their projects"
  ON company_profiles FOR UPDATE
  USING (user_owns_project(project_id));

-- Products policies
CREATE POLICY "Users can view products for their projects"
  ON products FOR SELECT
  USING (user_owns_project(project_id));

CREATE POLICY "Users can create products for their projects"
  ON products FOR INSERT
  WITH CHECK (user_owns_project(project_id));

CREATE POLICY "Users can update products for their projects"
  ON products FOR UPDATE
  USING (user_owns_project(project_id));

CREATE POLICY "Users can delete products for their projects"
  ON products FOR DELETE
  USING (user_owns_project(project_id));

-- Product versions policies
CREATE POLICY "Users can view product versions for their projects"
  ON product_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_versions.product_id
      AND user_owns_project(p.project_id)
    )
  );

-- Audience segments policies
CREATE POLICY "Users can view audience segments for their projects"
  ON audience_segments FOR SELECT
  USING (user_owns_project(project_id));

CREATE POLICY "Users can create audience segments for their projects"
  ON audience_segments FOR INSERT
  WITH CHECK (user_owns_project(project_id));

CREATE POLICY "Users can update audience segments for their projects"
  ON audience_segments FOR UPDATE
  USING (user_owns_project(project_id));

-- Campaigns policies
CREATE POLICY "Users can view campaigns for their projects"
  ON campaigns FOR SELECT
  USING (user_owns_project(project_id));

CREATE POLICY "Users can create campaigns for their projects"
  ON campaigns FOR INSERT
  WITH CHECK (user_owns_project(project_id));

CREATE POLICY "Users can update campaigns for their projects"
  ON campaigns FOR UPDATE
  USING (user_owns_project(project_id));

CREATE POLICY "Users can delete campaigns for their projects"
  ON campaigns FOR DELETE
  USING (user_owns_project(project_id));

-- Presenters policies
CREATE POLICY "Users can view presenters for their projects"
  ON presenters FOR SELECT
  USING (user_owns_project(project_id));

CREATE POLICY "Users can create presenters for their projects"
  ON presenters FOR INSERT
  WITH CHECK (user_owns_project(project_id));

-- Strategies policies
CREATE POLICY "Users can view strategies for their projects"
  ON strategies FOR SELECT
  USING (user_owns_project(project_id));

CREATE POLICY "Users can create strategies for their projects"
  ON strategies FOR INSERT
  WITH CHECK (user_owns_project(project_id));

-- Calendar versions policies
CREATE POLICY "Users can view calendar versions for their projects"
  ON calendar_versions FOR SELECT
  USING (user_owns_project(project_id));

CREATE POLICY "Users can create calendar versions for their projects"
  ON calendar_versions FOR INSERT
  WITH CHECK (user_owns_project(project_id));

-- Calendar posts policies
CREATE POLICY "Users can view calendar posts for their projects"
  ON calendar_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calendar_versions cv
      WHERE cv.id = calendar_posts.calendar_version_id
      AND user_owns_project(cv.project_id)
    )
  );

CREATE POLICY "Users can create calendar posts for their projects"
  ON calendar_posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calendar_versions cv
      WHERE cv.id = calendar_posts.calendar_version_id
      AND user_owns_project(cv.project_id)
    )
  );

-- Creative kits policies
CREATE POLICY "Users can view creative kits for their projects"
  ON creative_kits FOR SELECT
  USING (user_owns_project(project_id));

CREATE POLICY "Users can create creative kits for their projects"
  ON creative_kits FOR INSERT
  WITH CHECK (user_owns_project(project_id));

-- Kit items policies
CREATE POLICY "Users can view kit items for their projects"
  ON kit_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM creative_kits ck
      WHERE ck.id = kit_items.kit_id
      AND user_owns_project(ck.project_id)
    )
  );

-- Media assets policies
CREATE POLICY "Users can view media assets for their projects"
  ON media_assets FOR SELECT
  USING (user_owns_project(project_id));

CREATE POLICY "Users can create media assets for their projects"
  ON media_assets FOR INSERT
  WITH CHECK (user_owns_project(project_id));

CREATE POLICY "Users can update media assets for their projects"
  ON media_assets FOR UPDATE
  USING (user_owns_project(project_id));

CREATE POLICY "Users can delete media assets for their projects"
  ON media_assets FOR DELETE
  USING (user_owns_project(project_id));

-- UGC videos policies
CREATE POLICY "Users can view UGC videos for their projects"
  ON ugc_videos FOR SELECT
  USING (user_owns_project(project_id));

CREATE POLICY "Users can create UGC videos for their projects"
  ON ugc_videos FOR INSERT
  WITH CHECK (user_owns_project(project_id));

CREATE POLICY "Users can update UGC videos for their projects"
  ON ugc_videos FOR UPDATE
  USING (user_owns_project(project_id));

-- Characters policies
CREATE POLICY "Users can view characters for their projects"
  ON characters FOR SELECT
  USING (user_owns_project(project_id));

CREATE POLICY "Users can create characters for their projects"
  ON characters FOR INSERT
  WITH CHECK (user_owns_project(project_id));

CREATE POLICY "Users can update characters for their projects"
  ON characters FOR UPDATE
  USING (user_owns_project(project_id));

-- Video generation jobs policies
CREATE POLICY "Users can view video generation jobs for their projects"
  ON video_generation_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ugc_videos uv
      WHERE uv.id = video_generation_jobs.ugc_video_id
      AND user_owns_project(uv.project_id)
    )
  );

-- Integrations policies
CREATE POLICY "Users can view integrations for their projects"
  ON integrations FOR SELECT
  USING (user_owns_project(project_id));

CREATE POLICY "Users can create integrations for their projects"
  ON integrations FOR INSERT
  WITH CHECK (user_owns_project(project_id));

CREATE POLICY "Users can update integrations for their projects"
  ON integrations FOR UPDATE
  USING (user_owns_project(project_id));

-- Integration status policies
CREATE POLICY "Users can view integration status for their projects"
  ON integration_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM integrations i
      WHERE i.id = integration_status.integration_id
      AND user_owns_project(i.project_id)
    )
  );

-- Prompt runs policies
CREATE POLICY "Users can view prompt runs for their projects"
  ON prompt_runs FOR SELECT
  USING (project_id IS NULL OR user_owns_project(project_id));

-- Job runs policies
CREATE POLICY "Users can view job runs for their projects"
  ON job_runs FOR SELECT
  USING (project_id IS NULL OR user_owns_project(project_id));

-- Cost ledger policies
CREATE POLICY "Users can view cost ledger for their projects"
  ON cost_ledger FOR SELECT
  USING (project_id IS NULL OR user_owns_project(project_id));

-- Audit log policies
CREATE POLICY "Users can view audit log for their projects"
  ON audit_log FOR SELECT
  USING (project_id IS NULL OR user_owns_project(project_id));

-- Prompt templates are public (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view prompt templates"
  ON prompt_templates FOR SELECT
  TO authenticated
  USING (true);




-- ============================================
-- Migration: 003_triggers.sql
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_characters_updated_at
  BEFORE UPDATE ON characters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-increment version numbers
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.version := COALESCE(
      (SELECT MAX(version) FROM company_profiles WHERE project_id = NEW.project_id),
      0
    ) + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Version increments are handled in application code for better control
-- This is a placeholder for future use if needed




-- ============================================
-- Migration: 004_storage_buckets.sql
-- ============================================

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




-- ============================================
-- Migration: 005_prompt_templates_seed.sql
-- ============================================

-- Seed prompt templates

INSERT INTO prompt_templates (name, version, variables, json_schema, template_text)
VALUES
  (
    'COMPANY_PROFILE_FROM_SCRAPE',
    1,
    '["scraped_content", "website_url"]'::jsonb,
    '{
      "type": "object",
      "properties": {
        "brand_identity": {
          "type": "object",
          "properties": {
            "name": {"type": "string"},
            "tagline": {"type": "string"},
            "values": {"type": "array", "items": {"type": "string"}},
            "mission": {"type": "string"},
            "target_audience": {"type": "string"}
          }
        },
        "legal_pages_map": {
          "type": "object",
          "additionalProperties": {"type": "string"}
        },
        "product_catalog_map": {
          "type": "object",
          "properties": {
            "categories": {"type": "array", "items": {"type": "string"}},
            "product_types": {"type": "array", "items": {"type": "string"}},
            "price_range": {"type": "object"}
          }
        },
        "policies": {
          "type": "object",
          "properties": {
            "return_policy": {"type": "string"},
            "shipping_policy": {"type": "string"},
            "privacy_policy_summary": {"type": "string"}
          }
        }
      },
      "required": ["brand_identity"]
    }'::jsonb,
    'You are an expert brand analyst. Analyze the following scraped website content and extract structured information about the company.

Website URL: {{website_url}}

Scraped Content:
{{scraped_content}}

Extract and structure the following information:
1. Brand Identity: company name, tagline, core values, mission statement, target audience
2. Legal Pages Map: URLs and summaries of Terms of Service, Privacy Policy, Returns Policy, Shipping Policy
3. Product Catalog Map: categories, product types, price ranges
4. Policies: return policy, shipping policy, privacy policy summary

CRITICAL RULES:
- Only include information that is EVIDENCED in the scraped content
- Mark any inferred information clearly as "inferred"
- Include evidence references: {source_url, snippet, page_id} for each claim
- Do NOT invent pricing, certifications, or guarantees
- If information is missing, state "not found in scraped content"

Return a JSON object matching the provided schema.'
  ),
  (
    'AUDIENCE_SEGMENTATION',
    1,
    '["company_profile", "user_prompt", "enhanced_prompt"]'::jsonb,
    '{
      "type": "object",
      "properties": {
        "segments": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": {"type": "string"},
              "description": {"type": "string"},
              "targeting": {
                "type": "object",
                "properties": {
                  "demographics": {
                    "type": "object",
                    "properties": {
                      "age_min": {"type": "number"},
                      "age_max": {"type": "number"},
                      "gender": {"type": "array", "items": {"type": "string"}},
                      "locations": {"type": "array", "items": {"type": "string"}}
                    }
                  },
                  "interests": {"type": "array", "items": {"type": "string"}},
                  "behaviors": {"type": "array", "items": {"type": "string"}}
                }
              },
              "platform_configs": {
                "type": "object",
                "properties": {
                  "meta": {"type": "object"},
                  "google_ads": {"type": "object"},
                  "lazada": {"type": "object"},
                  "tiktok": {"type": "object"}
                }
              }
            },
            "required": ["name", "targeting"]
          }
        }
      },
      "required": ["segments"]
    }'::jsonb,
    'You are a marketing audience segmentation expert. Based on the company profile and user requirements, create detailed audience segments.

Company Profile:
{{company_profile}}

User Prompt: {{user_prompt}}

AI-Enhanced Prompt: {{enhanced_prompt}}

Create 2-4 audience segments that align with the company''s brand identity and target market. For each segment:

1. Define clear demographics (age, gender, locations)
2. Identify relevant interests and behaviors
3. Provide platform-specific configurations for:
   - Meta (Facebook/Instagram): interests, behaviors, lookalike audiences
   - Google Ads: keywords, demographics, in-market segments
   - Lazada: product interests, shopping behaviors
   - TikTok: interests, behaviors, video engagement patterns

CRITICAL RULES:
- Base segments on company profile data (evidenced)
- Use enhanced prompt to refine targeting
- Include evidence references linking to company profile data
- Do NOT create segments that don''t align with the brand
- Provide realistic audience sizes and targeting parameters

Return a JSON object with an array of audience segments matching the provided schema.'
  ),
  (
    'PRESENTER_DEFINITION',
    1,
    '["company_profile", "audience_segment"]'::jsonb,
    '{
      "type": "object",
      "properties": {
        "presenters": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": {"type": "string"},
              "description": {"type": "string"},
              "voice_attributes": {
                "type": "object",
                "properties": {
                  "tone": {"type": "string"},
                  "style": {"type": "string"},
                  "personality": {"type": "string"}
                }
              },
              "example_posts": {
                "type": "array",
                "items": {"type": "string"}
              }
            },
            "required": ["name", "voice_attributes"]
          }
        }
      },
      "required": ["presenters"]
    }'::jsonb,
    'You are a brand voice expert. Define brand voice personas (presenters) that will represent the company in content.

Company Profile:
{{company_profile}}

Target Audience Segment:
{{audience_segment}}

Create 1-2 presenter personas that:
1. Align with the company''s brand identity and values
2. Resonate with the target audience segment
3. Have distinct voice attributes (tone, style, personality)
4. Include example posts that demonstrate the voice

CRITICAL RULES:
- Base personas on company brand identity (evidenced)
- Ensure personas are consistent with brand values
- Provide realistic example posts
- Do NOT create personas that contradict the brand

Return a JSON object with an array of presenters matching the provided schema.'
  ),
  (
    'UNIFIED_STRATEGY_BUDGETED',
    1,
    '["company_profile", "monthly_budget", "budget_currency", "target_regions", "primary_channels"]'::jsonb,
    '{
      "type": "object",
      "properties": {
        "goals": {"type": "array", "items": {"type": "string"}},
        "channels": {"type": "array", "items": {"type": "string"}},
        "messaging": {"type": "string"},
        "cadence": {"type": "string"},
        "budget_allocation": {
          "type": "object",
          "additionalProperties": {"type": "number"}
        },
        "content_themes": {"type": "array", "items": {"type": "string"}},
        "key_metrics": {"type": "array", "items": {"type": "string"}}
      },
      "required": ["goals", "channels", "messaging"]
    }'::jsonb,
    'You are a marketing strategy expert. Create a comprehensive marketing strategy constrained by budget and business context.

Company Profile:
{{company_profile}}

Monthly Budget: {{monthly_budget}} {{budget_currency}}
Target Regions: {{target_regions}}
Primary Channels: {{primary_channels}}

Create a unified marketing strategy that includes:
1. Clear goals aligned with budget
2. Channel selection and allocation
3. Core messaging that reflects brand identity
4. Content cadence recommendations
5. Budget allocation across channels
6. Content themes
7. Key metrics to track

CRITICAL RULES:
- Budget allocation must sum to 100% across selected channels
- Strategy must be realistic for the budget amount
- Base messaging on company profile (evidenced)
- Include evidence references for strategy decisions
- Do NOT exceed budget constraints

Return a JSON object matching the provided schema.'
  ),
  (
    'CALENDAR_GENERATION_4W',
    1,
    '["strategy", "weeks", "start_date", "presenters"]'::jsonb,
    '{
      "type": "object",
      "properties": {
        "posts": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "channel": {"type": "string"},
              "scheduled_date": {"type": "string"},
              "copy": {"type": "string"},
              "brief": {"type": "string"},
              "presenter_id": {"type": "string"},
              "asset_requirements": {
                "type": "object",
                "properties": {
                  "images": {"type": "array", "items": {"type": "string"}},
                  "videos": {"type": "array", "items": {"type": "string"}}
                }
              }
            },
            "required": ["channel", "scheduled_date", "copy"]
          }
        }
      },
      "required": ["posts"]
    }'::jsonb,
    'You are a content calendar planner. Generate a {{weeks}}-week content calendar based on the marketing strategy.

Strategy:
{{strategy}}

Start Date: {{start_date}}
Available Presenters:
{{presenters}}

Create a detailed content calendar with:
1. Posts for multiple channels (at least 2 different channels)
2. Scheduled dates
3. Post copy (engaging, on-brand)
4. Creative brief for each post
5. Asset requirements (images, videos)
6. Presenter assignment

CRITICAL RULES:
- Ensure variety across channels and content types
- Align all content with strategy messaging
- Distribute posts evenly across the {{weeks}} weeks
- Include mix of educational, promotional, and engagement content
- Base content on strategy (evidenced)
- Do NOT create generic content

Return a JSON object with an array of calendar posts matching the provided schema.'
  ),
  (
    'CREATIVE_KIT_GENERATION',
    1,
    '["product", "audience_segment", "campaign", "presenter"]'::jsonb,
    '{
      "type": "object",
      "properties": {
        "kit_name": {"type": "string"},
        "description": {"type": "string"},
        "assets": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "type": {"type": "string", "enum": ["image", "video", "copy", "script"]},
              "prompt": {"type": "string"},
              "specifications": {"type": "object"}
            },
            "required": ["type", "prompt"]
          }
        }
      },
      "required": ["kit_name", "assets"]
    }'::jsonb,
    'You are a creative director. Generate a comprehensive creative kit for an ad campaign.

Product:
{{product}}

Target Audience:
{{audience_segment}}

Campaign Context:
{{campaign}}

Presenter Voice:
{{presenter}}

Create a creative kit that includes:
1. Multiple image assets with detailed prompts
2. Video concepts with shot lists
3. Ad copy variations
4. UGC script ideas

CRITICAL RULES:
- All creatives must align with product features and audience interests
- Use presenter voice for copy
- Include specific, detailed prompts for image/video generation
- Base creative direction on audience and product (evidenced)
- Do NOT create generic creative briefs

Return a JSON object matching the provided schema.'
  ),
  (
    'POST_COPY_AND_BRIEF',
    1,
    '["product", "audience_segment", "presenter", "channel"]'::jsonb,
    '{
      "type": "object",
      "properties": {
        "copy": {"type": "string"},
        "brief": {"type": "string"},
        "hashtags": {"type": "array", "items": {"type": "string"}},
        "call_to_action": {"type": "string"}
      },
      "required": ["copy", "brief"]
    }'::jsonb,
    'You are a social media copywriter. Write engaging post copy and creative brief.

Product:
{{product}}

Target Audience:
{{audience_segment}}

Presenter Voice:
{{presenter}}

Channel: {{channel}}

Create:
1. Engaging post copy (optimized for {{channel}})
2. Creative brief for visual assets
3. Relevant hashtags
4. Clear call-to-action

CRITICAL RULES:
- Match presenter voice and tone
- Optimize for {{channel}} best practices
- Include product benefits relevant to audience
- Base copy on product and audience data (evidenced)
- Do NOT use generic marketing language

Return a JSON object matching the provided schema.'
  ),
  (
    'IMAGE_PROMPT',
    1,
    '["product", "context", "style_preference"]'::jsonb,
    '{
      "type": "object",
      "properties": {
        "prompt": {"type": "string"},
        "style": {"type": "string"},
        "composition": {"type": "string"},
        "color_palette": {"type": "array", "items": {"type": "string"}}
      },
      "required": ["prompt"]
    }'::jsonb,
    'You are an image generation prompt engineer. Create a detailed prompt for AI image generation.

Product:
{{product}}

Context: {{context}}
Style Preference: {{style_preference}}

Create a detailed image generation prompt that includes:
1. Main subject and composition
2. Style and aesthetic
3. Color palette
4. Lighting and mood
5. Technical specifications

CRITICAL RULES:
- Be specific and detailed for best results
- Include product features naturally
- Match style to brand identity
- Do NOT include text in image descriptions (text is added separately)

Return a JSON object matching the provided schema.'
  ),
  (
    'UGC_SCRIPT',
    1,
    '["product", "location", "character", "duration_seconds"]'::jsonb,
    '{
      "type": "object",
      "properties": {
        "script": {"type": "string"},
        "duration_seconds": {"type": "number"},
        "scenes": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "timestamp": {"type": "number"},
              "action": {"type": "string"},
              "dialogue": {"type": "string"}
            }
          }
        },
        "product_showcase_timing": {"type": "number"}
      },
      "required": ["script"]
    }'::jsonb,
    'You are a UGC video script writer. Create a natural, authentic user-generated content script.

Product:
{{product}}

Location: {{location}}
Character: {{character}}
Target Duration: {{duration_seconds}} seconds

Create a UGC-style script that:
1. Feels authentic and unscripted
2. Showcases the product naturally
3. Includes dialogue that matches the character
4. Has clear scene structure
5. Highlights key product benefits

CRITICAL RULES:
- Script should feel like genuine user content, not advertising
- Include natural pauses and reactions
- Match character personality
- Base script on actual product features (evidenced)
- Do NOT use overly promotional language

Return a JSON object matching the provided schema.'
  )
ON CONFLICT (name, version) DO NOTHING;




-- ============================================
-- Migration: 006_add_encryption_key_env.sql
-- ============================================

-- Migration to add encryption key environment variable note
-- This is a documentation migration - the encryption key should be set in .env.local
-- CREDENTIALS_ENCRYPTION_KEY should be a 32-character string for AES-256-GCM

-- Note: The encryption key is managed in the application code, not in the database
-- Set CREDENTIALS_ENCRYPTION_KEY in your .env.local file (32 characters minimum)




-- ============================================
-- End of Migrations
-- ============================================
