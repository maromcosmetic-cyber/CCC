-- Migration: 003_functions_and_rls
-- Description: Add utility functions and row-level security policies
-- Created: 2024-01-15

-- ============================================================================
-- UTILITY FUNCTIONS
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
    unnest(do.topics) as topic,
    COUNT(*) as mention_count,
    AVG(do.sentiment_score) as sentiment_avg,
    ARRAY_AGG(DISTINCT se.platform) as platforms
  FROM social_events se
  JOIN decision_outputs do ON se.id = do.event_id
  WHERE do.brand_id = brand_id_param
    AND se.timestamp >= NOW() - INTERVAL '1 hour' * hours_back
  GROUP BY unnest(do.topics)
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

-- Function to get platform performance summary
CREATE OR REPLACE FUNCTION get_platform_performance(
  brand_id_param VARCHAR(255),
  days_back INTEGER DEFAULT 7
) RETURNS TABLE(
  platform platform_type,
  event_count BIGINT,
  avg_engagement_rate DECIMAL(5,4),
  sentiment_distribution JSONB,
  top_content_types content_type[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    se.platform,
    COUNT(*) as event_count,
    AVG(se.engagement_rate) as avg_engagement_rate,
    jsonb_build_object(
      'positive', COUNT(*) FILTER (WHERE do.sentiment_label = 'positive'),
      'neutral', COUNT(*) FILTER (WHERE do.sentiment_label = 'neutral'),
      'negative', COUNT(*) FILTER (WHERE do.sentiment_label = 'negative')
    ) as sentiment_distribution,
    ARRAY_AGG(DISTINCT ai.type ORDER BY COUNT(*) DESC) as top_content_types
  FROM social_events se
  JOIN decision_outputs do ON se.id = do.event_id
  LEFT JOIN asset_intelligence ai ON ai.brand_id = do.brand_id
  WHERE do.brand_id = brand_id_param
    AND se.timestamp >= NOW() - INTERVAL '1 day' * days_back
  GROUP BY se.platform
  ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql;

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

-- Note: These policies assume integration with Supabase auth
-- They will need to be adjusted based on the actual authentication system

-- Social Events: Users can access events related to their brand
CREATE POLICY "Brand access to social events" ON social_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM decision_outputs do 
      WHERE do.event_id = social_events.id 
      AND do.brand_id = auth.jwt() ->> 'brand_id'
    )
  );

-- Brand Playbooks: Users can access their brand's playbooks
CREATE POLICY "Brand access to playbooks" ON brand_playbooks
  FOR ALL USING (brand_id = auth.jwt() ->> 'brand_id');

-- Personas: Users can access their brand's personas
CREATE POLICY "Brand access to personas" ON personas
  FOR ALL USING (brand_id = auth.jwt() ->> 'brand_id');

-- Asset Intelligence: Users can access their brand's assets
CREATE POLICY "Brand access to assets" ON asset_intelligence
  FOR ALL USING (brand_id = auth.jwt() ->> 'brand_id');

-- Decision Outputs: Users can access their brand's decisions
CREATE POLICY "Brand access to decisions" ON decision_outputs
  FOR ALL USING (brand_id = auth.jwt() ->> 'brand_id');

-- Audit Logs: Users can access logs related to their brand's events/decisions
CREATE POLICY "Brand access to audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM decision_outputs do 
      WHERE do.id = audit_logs.decision_id 
      AND do.brand_id = auth.jwt() ->> 'brand_id'
    )
    OR
    EXISTS (
      SELECT 1 FROM social_events se
      JOIN decision_outputs do ON se.id = do.event_id
      WHERE se.id = audit_logs.event_id 
      AND do.brand_id = auth.jwt() ->> 'brand_id'
    )
  );

-- Performance Metrics: System administrators and brand users can access
CREATE POLICY "Brand access to performance metrics" ON performance_metrics
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin' 
    OR 
    metadata ->> 'brand_id' = auth.jwt() ->> 'brand_id'
  );