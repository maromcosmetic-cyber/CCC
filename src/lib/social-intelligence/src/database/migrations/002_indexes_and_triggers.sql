-- Migration: 002_indexes_and_triggers
-- Description: Add indexes, triggers, and performance optimizations
-- Created: 2024-01-15

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

-- Audit Logs Indexes
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_event_id ON audit_logs(event_id);
CREATE INDEX idx_audit_logs_decision_id ON audit_logs(decision_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);

-- Performance Metrics Indexes
CREATE INDEX idx_performance_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX idx_performance_metrics_component ON performance_metrics(component);
CREATE INDEX idx_performance_metrics_name ON performance_metrics(metric_name);

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

CREATE TRIGGER update_social_events_updated_at 
  BEFORE UPDATE ON social_events 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_playbooks_updated_at 
  BEFORE UPDATE ON brand_playbooks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personas_updated_at 
  BEFORE UPDATE ON personas 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asset_intelligence_updated_at 
  BEFORE UPDATE ON asset_intelligence 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_decision_outputs_updated_at 
  BEFORE UPDATE ON decision_outputs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();