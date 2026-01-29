-- Add short_description columns if they don't exist

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS short_description text,
ADD COLUMN IF NOT EXISTS short_description_he text;

-- Optional: Add comments
COMMENT ON COLUMN products.short_description IS 'English short description for quick view and product cards';
COMMENT ON COLUMN products.short_description_he IS 'Hebrew short description for quick view and product cards';
