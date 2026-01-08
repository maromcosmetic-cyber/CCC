-- Ensure email_settings table exists (Fix for missing table error)
-- Re-applying logic from 007 and 008 just in case they were skipped

-- 1. Email Settings Table
CREATE TABLE IF NOT EXISTS email_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  sender_name TEXT,
  sender_email TEXT,
  smtp_host TEXT,
  smtp_port INTEGER DEFAULT 587,
  smtp_user TEXT,
  smtp_pass TEXT, -- Encrypted
  smtp_secure BOOLEAN DEFAULT TRUE,
  -- Columns from 008_email_oauth.sql
  gmail_access_token TEXT,
  gmail_refresh_token TEXT,
  gmail_token_expiry BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id)
);

-- 2. Email Subscribers (from 007)
CREATE TABLE IF NOT EXISTS email_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  status TEXT DEFAULT 'subscribed', -- subscribed, unsubscribed, bounced
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, email)
);

-- 3. Email Templates (from 007)
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  subject TEXT,
  content_html TEXT,
  design_json JSONB, -- For Email Builder state
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Email Campaigns (from 007)
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  template_id UUID REFERENCES email_templates(id),
  status TEXT DEFAULT 'draft', -- draft, scheduled, sending, sent, failed
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  stats JSONB DEFAULT '{"sent": 0, "opened": 0, "clicked": 0, "bounced": 0}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Enable RLS
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

-- Re-apply Policies (DROP first to ensure no conflicts if they exist)

-- email_settings policies
DROP POLICY IF EXISTS "Users can view email settings for their projects" ON email_settings;
CREATE POLICY "Users can view email settings for their projects" ON email_settings
  FOR SELECT USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update email settings for their projects" ON email_settings;
CREATE POLICY "Users can update email settings for their projects" ON email_settings
  FOR UPDATE USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert email settings for their projects" ON email_settings;
CREATE POLICY "Users can insert email settings for their projects" ON email_settings
  FOR INSERT WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- email_subscribers policies
DROP POLICY IF EXISTS "Users can view subscribers for their projects" ON email_subscribers;
CREATE POLICY "Users can view subscribers for their projects" ON email_subscribers
  FOR SELECT USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage subscribers" ON email_subscribers;
CREATE POLICY "Users can manage subscribers" ON email_subscribers
  FOR ALL USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- email_templates policies
DROP POLICY IF EXISTS "Users can view templates for their projects" ON email_templates;
CREATE POLICY "Users can view templates for their projects" ON email_templates
  FOR SELECT USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage templates" ON email_templates;
CREATE POLICY "Users can manage templates" ON email_templates
  FOR ALL USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- email_campaigns policies
DROP POLICY IF EXISTS "Users can view campaigns for their projects" ON email_campaigns;
CREATE POLICY "Users can view campaigns for their projects" ON email_campaigns
  FOR SELECT USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage campaigns" ON email_campaigns;
CREATE POLICY "Users can manage campaigns" ON email_campaigns
  FOR ALL USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
