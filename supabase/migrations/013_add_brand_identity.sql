-- Add brand_identity to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS brand_identity JSONB DEFAULT '{}'::jsonb;
