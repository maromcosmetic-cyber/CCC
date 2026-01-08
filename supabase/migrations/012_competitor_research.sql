-- Competitor Intelligence Tables

-- 1. Competitors Tracking
CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  
  -- Basic Info
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  facebook_page_id TEXT, -- For Ad Library API
  
  -- Analysis Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  last_analyzed_at TIMESTAMPTZ,
  
  -- The AI Brain Dump
  analysis_json JSONB, -- Stores SWOT, Ad Angles, Brand Voice, etc.
  
  -- Meta API Data
  active_ads_count INTEGER DEFAULT 0,
  ad_library_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view competitors for their projects" ON competitors
  FOR SELECT USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert competitors for their projects" ON competitors
  FOR INSERT WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can update competitors for their projects" ON competitors
  FOR UPDATE USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete competitors for their projects" ON competitors
  FOR DELETE USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
