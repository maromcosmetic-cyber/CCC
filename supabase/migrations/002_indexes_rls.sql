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


