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

-- Media assets table (created before kit_items to avoid forward reference)
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

