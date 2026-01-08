-- Migration to add encryption key environment variable note
-- This is a documentation migration - the encryption key should be set in .env.local
-- CREDENTIALS_ENCRYPTION_KEY should be a 32-character string for AES-256-GCM

-- Note: The encryption key is managed in the application code, not in the database
-- Set CREDENTIALS_ENCRYPTION_KEY in your .env.local file (32 characters minimum)


