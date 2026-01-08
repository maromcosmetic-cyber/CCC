-- Add Gmail OAuth columns to email_settings

ALTER TABLE email_settings
ADD COLUMN IF NOT EXISTS gmail_access_token TEXT,
ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS gmail_token_expiry BIGINT;
