-- Legal Pages Table
CREATE TABLE IF NOT EXISTS legal_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    page_type VARCHAR(50) NOT NULL, -- 'privacy', 'terms', 'refund', 'shipping', 'cookies', 'disclaimer'
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    wordpress_page_id INTEGER, -- ID of the page in WordPress
    wordpress_slug VARCHAR(255), -- Slug of the page in WordPress
    last_synced_at TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'synced', 'error'
    sync_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, page_type)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_legal_pages_project_id ON legal_pages(project_id);
CREATE INDEX IF NOT EXISTS idx_legal_pages_page_type ON legal_pages(page_type);

-- Add wordpress to integration provider types
ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_provider_type_check;
ALTER TABLE integrations ADD CONSTRAINT integrations_provider_type_check 
    CHECK (provider_type IN (
        'meta', 'google_ads', 'lazada', 'tiktok', 'woocommerce', 
        'whatsapp', 'firecrawl', 'llm', 'image', 'video', 'elevenlabs', 
        'synclabs', 'google_analytics', 'google_business', 'microsoft_clarity',
        'wordpress'
    ));
