-- ============================================================================
-- Brand-Aware Social Intelligence & Action Engine Database Schema
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ============================================================================
-- ENUMS
-- ============================================================================

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

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Social Events Table
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

-- Brand Playbooks Table
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

-- Personas Table
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

-- Asset Intelligence Table
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

-- Decision Outputs Table
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

-- ============================================================================
-- AUDIT AND LOGGING TABLES
-- ============================================================================

-- Audit Log Table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES social_events(id),
  decision_id UUID REFERENCES decision_outputs(id),
  action_type VARCHAR(100) NOT NULL,
  actor_type VARCHAR(50) NOT NULL, -- 'system', 'user', 'api'
  actor_id VARCHAR(255),
  description TEXT NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for efficient querying
  INDEX idx_audit_logs_timestamp (timestamp),
  INDEX idx_audit_logs_event_id (event_id),
  INDEX idx_audit_logs_decision_id (decision_id),
  INDEX idx_audit_logs_action_type (action_type)
);

-- System Performance Metrics Table
CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,4) NOT NULL,
  metric_unit VARCHAR(50),
  component VARCHAR(100) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  
  -- Indexes for time-series queries
  INDEX idx_performance_metrics_timestamp (timestamp),
  INDEX idx_performance_metrics_component (component),
  INDEX idx_performance_metrics_name (metric_name)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Social Events Indexes
CREATE INDEX idx_social_events_platform ON social_events(platform);
CREATE INDEX idx_social_events_timestamp ON social_events(timestamp);
CREATE INDEX idx_social_events_event_type ON social_events(event_type);
CREATE INDEX idx_social_events_author_id ON social_events(author_id);
CREATE INDEX idx_social_events_content_text_gin ON social_events USING gin(to_tsvector('english', content_text));
CREATE INDEX idx_social_events_hashtags_gin ON social_events USING gin(content_hashtags);
CREATE INDEX idx_social_events_mentions_gin ON social_events USING gin(content_mentions);
CREATE INDEX idx_social_events_location ON social_events USING gist(location_coordinates);

-- Brand Playbooks Indexes
CREATE INDEX idx_brand_playbooks_brand_id ON brand_playbooks(brand_id);
CREATE INDEX idx_brand_playbooks_version ON brand_playbooks(brand_id, version);

-- Personas Indexes
CREATE INDEX idx_personas_brand_id ON personas(brand_id);
CREATE INDEX idx_personas_name ON personas(brand_id, name);

-- Asset Intelligence Indexes
CREATE INDEX idx_asset_intelligence_brand_id ON asset_intelligence(brand_id);
CREATE INDEX idx_asset_intelligence_type ON asset_intelligence(type);
CREATE INDEX idx_asset_intelligence_category ON asset_intelligence(category);
CREATE INDEX idx_asset_intelligence_tags_gin ON asset_intelligence USING gin(tags);
CREATE INDEX idx_asset_intelligence_platforms_gin ON asset_intelligence USING gin(allowed_platforms);

-- Decision Outputs Indexes
CREATE INDEX idx_decision_outputs_event_id ON decision_outputs(event_id);
CREATE INDEX idx_decision_outputs_brand_id ON decision_outputs(brand_id);
CREATE INDEX idx_decision_outputs_timestamp ON decision_outputs(timestamp);
CREATE INDEX idx_decision_outputs_urgency ON decision_outputs(urgency);
CREATE INDEX idx_decision_outputs_primary_action ON decision_outputs(primary_action);
CREATE INDEX idx_decision_outputs_human_review ON decision_outputs(human_review_required);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_social_events_updated_at BEFORE UPDATE ON social_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_brand_playbooks_updated_at BEFORE UPDATE ON brand_playbooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_personas_updated_at BEFORE UPDATE ON personas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_asset_intelligence_updated_at BEFORE UPDATE ON asset_intelligence FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_decision_outputs_updated_at BEFORE UPDATE ON decision_outputs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE social_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies (these will be customized based on authentication system)
-- For now, allowing authenticated users to access their brand's data

CREATE POLICY "Users can access their brand's social events" ON social_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM brand_playbooks bp 
      WHERE bp.brand_id = auth.jwt() ->> 'brand_id'
    )
  );

CREATE POLICY "Users can access their brand's playbooks" ON brand_playbooks
  FOR ALL USING (brand_id = auth.jwt() ->> 'brand_id');

CREATE POLICY "Users can access their brand's personas" ON personas
  FOR ALL USING (brand_id = auth.jwt() ->> 'brand_id');

CREATE POLICY "Users can access their brand's assets" ON asset_intelligence
  FOR ALL USING (brand_id = auth.jwt() ->> 'brand_id');

CREATE POLICY "Users can access their brand's decisions" ON decision_outputs
  FOR ALL USING (brand_id = auth.jwt() ->> 'brand_id');

-- ============================================================================
-- FUNCTIONS AND PROCEDURES
-- ============================================================================

-- Function to calculate engagement rate
CREATE OR REPLACE FUNCTION calculate_engagement_rate(
  likes INTEGER,
  shares INTEGER,
  comments INTEGER,
  views INTEGER
) RETURNS DECIMAL(5,4) AS $$
BEGIN
  IF views = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN LEAST(1.0, (likes + shares + comments)::DECIMAL / views);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get trending topics
CREATE OR REPLACE FUNCTION get_trending_topics(
  brand_id_param VARCHAR(255),
  hours_back INTEGER DEFAULT 24,
  min_mentions INTEGER DEFAULT 5
) RETURNS TABLE(
  topic TEXT,
  mention_count BIGINT,
  sentiment_avg DECIMAL(3,2),
  platforms platform_type[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    unnest(se.topics) as topic,
    COUNT(*) as mention_count,
    AVG(do.sentiment_score) as sentiment_avg,
    ARRAY_AGG(DISTINCT se.platform) as platforms
  FROM social_events se
  JOIN decision_outputs do ON se.id = do.event_id
  WHERE do.brand_id = brand_id_param
    AND se.timestamp >= NOW() - INTERVAL '1 hour' * hours_back
  GROUP BY unnest(se.topics)
  HAVING COUNT(*) >= min_mentions
  ORDER BY mention_count DESC, sentiment_avg DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get persona match statistics
CREATE OR REPLACE FUNCTION get_persona_match_stats(
  brand_id_param VARCHAR(255),
  days_back INTEGER DEFAULT 30
) RETURNS TABLE(
  persona_name VARCHAR(255),
  match_count BIGINT,
  avg_sentiment DECIMAL(3,2),
  top_platforms platform_type[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.name as persona_name,
    COUNT(*) as match_count,
    AVG(do.sentiment_score) as avg_sentiment,
    ARRAY_AGG(DISTINCT se.platform ORDER BY COUNT(*) DESC) as top_platforms
  FROM decision_outputs do
  JOIN personas p ON do.matched_persona_id = p.id
  JOIN social_events se ON do.event_id = se.id
  WHERE do.brand_id = brand_id_param
    AND do.timestamp >= NOW() - INTERVAL '1 day' * days_back
  GROUP BY p.id, p.name
  ORDER BY match_count DESC;
END;
$$ LANGUAGE plpgsql;