-- Add metadata column to media_assets if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_assets' AND column_name = 'metadata') THEN
        ALTER TABLE media_assets ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_assets' AND column_name = 'product_ids') THEN
        ALTER TABLE media_assets ADD COLUMN product_ids UUID[] DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_assets' AND column_name = 'image_type') THEN
        ALTER TABLE media_assets ADD COLUMN image_type TEXT;
    END IF;
END $$;
