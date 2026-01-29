-- Migration: 001_initial_schema
-- Description: Initial schema for Brand-Aware Social Intelligence & Action Engine
-- Created: 2024-01-15

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create enums
CREATE TYPE platform_type AS ENUM (
  'tiktok',
  'instagram', 
  'facebook',
  'youtube',
  'reddit',
  'rss'
);

CREATE TYPE event_type AS ENUM (
  'post',
  'comment',
  'mention',
  'message',
  'share',
  'reaction'
);

CREATE TYPE content_type AS ENUM (
  'video',
  'image',
  'text',
  'carousel',
  'story'
);

CREATE TYPE sentiment_label AS ENUM (
  'positive',
  'negative',
  'neutral'
);

CREATE TYPE intent_category AS ENUM (
  'purchase_inquiry',
  'support_request',
  'complaint',
  'information_seeking',
  'praise',
  'feature_request',
  'comparison_shopping'
);

CREATE TYPE action_type AS ENUM (
  'respond',
  'engage',
  'create',
  'escalate',
  'monitor',
  'suppress'
);

CREATE TYPE urgency_level AS ENUM (
  'critical',
  'high',
  'medium',
  'low',
  'minimal'
);

CREATE TYPE license_type AS ENUM (
  'brand_owned',
  'licensed',
  'ugc_permission'
);

CREATE TYPE creator_type AS ENUM (
  'internal',
  'ugc',
  'influencer'
);

-- Create core tables
CREATE TABLE social_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform platform_type NOT NULL,
  platform_id VARCHAR(255) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  event_type event_type NOT NULL,
  
  -- Content
  content_text TEXT,
  content_media_urls TEXT[],
  content_hashtags TEXT[],
  content_mentions TEXT[],
  content_language VARCHAR(10) DEFAULT 'en',
  
  -- Author
  author_id VARCHAR(255) NOT NULL,
  author_username VARCHAR(255) NOT NULL,
  author_display_name VARCHAR(255) NOT NULL,
  author_follower_count INTEGER DEFAULT 0,
  author_verified BOOLEAN DEFAULT FALSE,
  author_profile_url TEXT,
  
  -- Engagement
  engagement_likes INTEGER DEFAULT 0,
  engagement_shares INTEGER DEFAULT 0,
  engagement_comments INTEGER DEFAULT 0,
  engagement_views INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,4) DEFAULT 0,
  
  -- Context
  context_parent_post_id VARCHAR(255),
  context_thread_id VARCHAR(255),
  context_conversation_id VARCHAR(255),
  context_is_reply BOOLEAN DEFAULT FALSE,
  context_reply_to_user_id VARCHAR(255),
  
  -- Location
  location_country VARCHAR(100),
  location_region VARCHAR(100),
  location_city VARCHAR(100),
  location_coordinates POINT,
  
  -- Metadata
  metadata_source VARCHAR(50) NOT NULL,
  metadata_processing_timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata_version VARCHAR(10) DEFAULT '1.0',
  metadata_raw_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(platform, platform_id),
  CHECK (engagement_rate >= 0 AND engagement_rate <= 1),
  CHECK (author_follower_count >= 0),
  CHECK (engagement_likes >= 0),
  CHECK (engagement_shares >= 0),
  CHECK (engagement_comments >= 0),
  CHECK (engagement_views >= 0)
);

CREATE TABLE brand_playbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL,
  
  -- Brand Identity
  brand_identity JSONB NOT NULL,
  
  -- Voice and Tone
  voice_and_tone JSONB NOT NULL,
  
  -- Compliance Rules
  compliance_rules JSONB NOT NULL,
  
  -- Visual Guidelines
  visual_guidelines JSONB NOT NULL,
  
  -- Platform Specific Rules
  platform_specific_rules JSONB NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(brand_id, version)
);

CREATE TABLE personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  brand_id VARCHAR(255) NOT NULL,
  
  -- Demographics
  demographics JSONB NOT NULL,
  
  -- Psychographics
  psychographics JSONB NOT NULL,
  
  -- Behavior Patterns
  behavior_patterns JSONB NOT NULL,
  
  -- Platform Preferences
  platform_preferences JSONB NOT NULL,
  
  -- Triggers
  triggers JSONB NOT NULL,
  
  -- Response Strategies
  response_strategies JSONB NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(brand_id, name)
);

CREATE TABLE asset_intelligence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type content_type NOT NULL,
  brand_id VARCHAR(255) NOT NULL,
  
  -- Metadata
  title VARCHAR(500) NOT NULL,
  description TEXT,
  tags TEXT[],
  category VARCHAR(100),
  creator_type creator_type NOT NULL,
  creator_id VARCHAR(255) NOT NULL,
  creator_name VARCHAR(255) NOT NULL,
  creator_attribution TEXT,
  
  -- Technical Specs
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER, -- in seconds
  width INTEGER,
  height INTEGER,
  aspect_ratio VARCHAR(20),
  file_size BIGINT NOT NULL,
  format VARCHAR(50) NOT NULL,
  quality VARCHAR(50),
  
  -- Usage Rights
  license license_type NOT NULL,
  expiration_date TIMESTAMPTZ,
  allowed_platforms platform_type[],
  restrictions TEXT[],
  commercial_use BOOLEAN DEFAULT TRUE,
  
  -- Performance Data
  performance_data JSONB,
  
  -- Content Analysis
  content_analysis JSONB,
  
  -- Optimization Suggestions
  optimization_suggestions JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CHECK (file_size > 0),
  CHECK (duration IS NULL OR duration > 0),
  CHECK (width IS NULL OR width > 0),
  CHECK (height IS NULL OR height > 0)
);

CREATE TABLE decision_outputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES social_events(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Brand Context
  brand_id VARCHAR(255) NOT NULL,
  playbook_version VARCHAR(50) NOT NULL,
  matched_persona_id UUID REFERENCES personas(id),
  compliance_status VARCHAR(50) NOT NULL,
  
  -- Analysis Results
  sentiment_score DECIMAL(3,2) NOT NULL,
  sentiment_label sentiment_label NOT NULL,
  sentiment_confidence DECIMAL(3,2) NOT NULL,
  
  intent_primary intent_category NOT NULL,
  intent_secondary intent_category,
  intent_confidence DECIMAL(3,2) NOT NULL,
  
  topics TEXT[],
  urgency urgency_level NOT NULL,
  brand_impact VARCHAR(100) NOT NULL,
  
  -- Decision
  primary_action action_type NOT NULL,
  secondary_actions action_type[],
  decision_confidence DECIMAL(3,2) NOT NULL,
  reasoning TEXT NOT NULL,
  human_review_required BOOLEAN DEFAULT FALSE,
  escalation_level VARCHAR(50) NOT NULL,
  
  -- Actions and Monitoring
  recommended_actions JSONB NOT NULL,
  webhooks JSONB,
  monitoring JSONB NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  CHECK (sentiment_confidence >= 0 AND sentiment_confidence <= 1),
  CHECK (intent_confidence >= 0 AND intent_confidence <= 1),
  CHECK (decision_confidence >= 0 AND decision_confidence <= 1)
);

-- Create audit and logging tables
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES social_events(id),
  decision_id UUID REFERENCES decision_outputs(id),
  action_type VARCHAR(100) NOT NULL,
  actor_type VARCHAR(50) NOT NULL, -- 'system', 'user', 'api'
  actor_id VARCHAR(255),
  description TEXT NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,4) NOT NULL,
  metric_unit VARCHAR(50),
  component VARCHAR(100) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);