-- Seed data for demo project
-- This creates a complete demo project with all necessary data for UI testing

-- Insert demo user (this would normally be created via auth, but for seed we'll reference a UUID)
-- In production, this would be created through Supabase Auth
DO $$
DECLARE
  demo_user_id UUID := '00000000-0000-0000-0000-000000000001';
  demo_project_id UUID;
  demo_scrape_run_id UUID;
  demo_company_profile_id UUID;
  demo_product_1_id UUID;
  demo_product_2_id UUID;
  demo_product_3_id UUID;
  demo_audience_1_id UUID;
  demo_audience_2_id UUID;
  demo_audience_3_id UUID;
  demo_presenter_1_id UUID;
  demo_presenter_2_id UUID;
  demo_strategy_id UUID;
  demo_calendar_version_id UUID;
  demo_character_1_id UUID;
  demo_character_2_id UUID;
  demo_ugc_video_id UUID;
BEGIN
  -- Create demo project
  INSERT INTO projects (
    id, user_id, name, website_url, monthly_budget_amount, monthly_budget_currency,
    target_regions, languages, primary_channels, industry
  ) VALUES (
    gen_random_uuid(),
    demo_user_id,
    'Example Store',
    'https://example.com',
    5000.00,
    'USD',
    '["North America", "Europe"]'::jsonb,
    '["en", "es"]'::jsonb,
    '["meta", "google_ads"]'::jsonb,
    'E-commerce'
  ) RETURNING id INTO demo_project_id;

  -- Create scrape run
  INSERT INTO scrape_runs (
    id, project_id, version, status, started_at, completed_at, config
  ) VALUES (
    gen_random_uuid(),
    demo_project_id,
    1,
    'completed',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days' + INTERVAL '30 minutes',
    '{"max_pages": 20, "include_legal": true}'::jsonb
  ) RETURNING id INTO demo_scrape_run_id;

  -- Create scrape pages
  INSERT INTO scrape_pages (scrape_run_id, url, title, content, html_content, page_type, evidence_snippets, storage_path)
  VALUES
    (demo_scrape_run_id, 'https://example.com', 'Example Store - Home', 'Welcome to Example Store. We sell high-quality products.', '<html>...</html>', 'home', '[]'::jsonb, demo_project_id::text || '/scraped/home.html'),
    (demo_scrape_run_id, 'https://example.com/products', 'Products - Example Store', 'Browse our amazing products', '<html>...</html>', 'product', '[]'::jsonb, demo_project_id::text || '/scraped/products.html'),
    (demo_scrape_run_id, 'https://example.com/terms', 'Terms of Service', 'Terms and conditions apply...', '<html>...</html>', 'legal', '[{"text": "Terms apply to all purchases", "url": "https://example.com/terms"}]'::jsonb, demo_project_id::text || '/scraped/terms.html'),
    (demo_scrape_run_id, 'https://example.com/privacy', 'Privacy Policy', 'We respect your privacy...', '<html>...</html>', 'legal', '[{"text": "Data is encrypted", "url": "https://example.com/privacy"}]'::jsonb, demo_project_id::text || '/scraped/privacy.html'),
    (demo_scrape_run_id, 'https://example.com/returns', 'Returns Policy', '30-day return policy...', '<html>...</html>', 'legal', '[{"text": "30-day returns", "url": "https://example.com/returns"}]'::jsonb, demo_project_id::text || '/scraped/returns.html');

  -- Create company profile
  INSERT INTO company_profiles (
    id, project_id, version, locked_at, locked_by, profile_data, evidence_refs, storage_path
  ) VALUES (
    gen_random_uuid(),
    demo_project_id,
    1,
    NOW() - INTERVAL '1 day',
    demo_user_id,
    '{
      "brand_identity": {
        "name": "Example Store",
        "tagline": "Quality Products for Everyone",
        "values": ["Quality", "Customer Service", "Innovation"]
      },
      "legal_pages_map": {
        "terms": "https://example.com/terms",
        "privacy": "https://example.com/privacy",
        "returns": "https://example.com/returns"
      },
      "product_catalog_map": {
        "categories": ["Electronics", "Home", "Fashion"]
      }
    }'::jsonb,
    '[
      {"source_url": "https://example.com", "snippet": "Welcome to Example Store", "page_id": "home"},
      {"source_url": "https://example.com/terms", "snippet": "Terms apply to all purchases", "page_id": "terms"}
    ]'::jsonb,
    demo_project_id::text || '/company-profile/v1.json'
  ) RETURNING id INTO demo_company_profile_id;

  -- Create products
  INSERT INTO products (id, project_id, source_id, name, description, price, currency, stock_status, images, metadata)
  VALUES
    (gen_random_uuid(), demo_project_id, 'wc-001', 'Premium Headphones', 'High-quality wireless headphones with noise cancellation', 199.99, 'USD', 'in_stock', '[{"url": "https://example.com/images/headphones.jpg", "alt": "Premium Headphones"}]'::jsonb, '{"brand": "AudioTech", "warranty": "2 years"}'::jsonb)
    RETURNING id INTO demo_product_1_id,
    (gen_random_uuid(), demo_project_id, 'wc-002', 'Smart Watch', 'Feature-rich smartwatch with health tracking', 299.99, 'USD', 'in_stock', '[{"url": "https://example.com/images/watch.jpg", "alt": "Smart Watch"}]'::jsonb, '{"brand": "TechWear", "warranty": "1 year"}'::jsonb)
    RETURNING id INTO demo_product_2_id,
    (gen_random_uuid(), demo_project_id, 'wc-003', 'Wireless Speaker', 'Portable Bluetooth speaker with 360° sound', 149.99, 'USD', 'in_stock', '[{"url": "https://example.com/images/speaker.jpg", "alt": "Wireless Speaker"}]'::jsonb, '{"brand": "SoundMax", "warranty": "1 year"}'::jsonb)
    RETURNING id INTO demo_product_3_id;

  -- Create audience segments
  INSERT INTO audience_segments (
    id, project_id, version, name, description, company_profile_version_id,
    user_prompt, ai_enhanced_prompt, targeting, platform_specific_configs, ai_suggested, evidence_refs
  ) VALUES
    (
      gen_random_uuid(),
      demo_project_id,
      1,
      'Tech Enthusiasts',
      'Young professionals interested in technology and innovation',
      demo_company_profile_id,
      'tech-savvy professionals',
      'Tech-savvy professionals aged 25-40, interested in electronics, innovation, and quality products. Based on Example Store brand values of Quality and Innovation.',
      '{"demographics": {"age_min": 25, "age_max": 40}, "interests": ["technology", "electronics", "innovation"]}'::jsonb,
      '{"meta": {"interests": ["Technology", "Electronics"], "behaviors": ["Engaged Shoppers"]}, "google_ads": {"keywords": ["tech products", "electronics"]}}'::jsonb,
      true,
      '[{"source_url": "https://example.com", "snippet": "Quality Products for Everyone"}]'::jsonb
    ) RETURNING id INTO demo_audience_1_id,
    (
      gen_random_uuid(),
      demo_project_id,
      1,
      'Home Decor Enthusiasts',
      'People interested in home improvement and decor',
      NULL,
      NULL,
      NULL,
      '{"demographics": {"age_min": 30, "age_max": 55}, "interests": ["home decor", "interior design"]}'::jsonb,
      '{}'::jsonb,
      false,
      '[]'::jsonb
    ) RETURNING id INTO demo_audience_2_id,
    (
      gen_random_uuid(),
      demo_project_id,
      1,
      'Fashion Forward',
      'Trend-conscious shoppers interested in fashion',
      NULL,
      NULL,
      NULL,
      '{"demographics": {"age_min": 18, "age_max": 35}, "interests": ["fashion", "style"]}'::jsonb,
      '{}'::jsonb,
      false,
      '[]'::jsonb
    ) RETURNING id INTO demo_audience_3_id;

  -- Create campaigns
  INSERT INTO campaigns (
    project_id, platform, name, description, status, budget_amount, budget_currency,
    targeting_config, product_id, insights_data
  ) VALUES
    (demo_project_id, 'meta', 'Q1 Headphones Campaign', 'Promote premium headphones on Meta', 'active', 1000.00, 'USD', '{"audience_segment_id": "' || demo_audience_1_id || '"}'::jsonb, demo_product_1_id, '{"impressions": 50000, "clicks": 1200, "spend": 850.50, "conversions": 45}'::jsonb),
    (demo_project_id, 'google_ads', 'Smart Watch Search', 'Google Ads campaign for smart watches', 'active', 1500.00, 'USD', '{"audience_segment_id": "' || demo_audience_1_id || '"}'::jsonb, demo_product_2_id, '{"impressions": 75000, "clicks": 2100, "spend": 1420.00, "conversions": 78}'::jsonb),
    (demo_project_id, 'lazada', 'Electronics Promotion', 'Lazada campaign for electronics', 'paused', 800.00, 'USD', '{"audience_segment_id": "' || demo_audience_1_id || '"}'::jsonb, demo_product_1_id, '{"impressions": 30000, "clicks": 800, "spend": 650.00, "conversions": 32}'::jsonb),
    (demo_project_id, 'tiktok', 'Viral Speaker Campaign', 'TikTok video campaign for wireless speakers', 'active', 2000.00, 'USD', '{"audience_segment_id": "' || demo_audience_3_id || '"}'::jsonb, demo_product_3_id, '{"impressions": 120000, "clicks": 3500, "spend": 1850.00, "conversions": 120}'::jsonb);

  -- Create presenters
  INSERT INTO presenters (
    id, project_id, version, name, description, audience_segment_id, voice_attributes, example_posts
  ) VALUES
    (
      gen_random_uuid(),
      demo_project_id,
      1,
      'Tech Expert Alex',
      'Knowledgeable and enthusiastic about technology',
      demo_audience_1_id,
      '{"tone": "professional", "style": "informative", "personality": "enthusiastic"}'::jsonb,
      '[]'::jsonb
    ) RETURNING id INTO demo_presenter_1_id,
    (
      gen_random_uuid(),
      demo_project_id,
      1,
      'Fashionista Sam',
      'Trendy and style-conscious voice',
      demo_audience_3_id,
      '{"tone": "casual", "style": "trendy", "personality": "friendly"}'::jsonb,
      '[]'::jsonb
    ) RETURNING id INTO demo_presenter_2_id;

  -- Create strategy
  INSERT INTO strategies (
    id, project_id, version, company_profile_version_id, strategy_data, evidence_refs
  ) VALUES (
    gen_random_uuid(),
    demo_project_id,
    1,
    demo_company_profile_id,
    '{
      "goals": ["Increase brand awareness", "Drive sales"],
      "channels": ["meta", "google_ads"],
      "messaging": "Quality products for everyone",
      "cadence": "daily",
      "budget_allocation": {"meta": 40, "google_ads": 60}
    }'::jsonb,
    '[{"source_url": "https://example.com", "snippet": "Quality Products for Everyone"}]'::jsonb
  ) RETURNING id INTO demo_strategy_id;

  -- Create calendar version
  INSERT INTO calendar_versions (
    id, project_id, version, strategy_version_id, weeks, start_date
  ) VALUES (
    gen_random_uuid(),
    demo_project_id,
    1,
    demo_strategy_id,
    4,
    CURRENT_DATE
  ) RETURNING id INTO demo_calendar_version_id;

  -- Create calendar posts
  INSERT INTO calendar_posts (calendar_version_id, channel, scheduled_date, presenter_id, post_data, status)
  VALUES
    (demo_calendar_version_id, 'meta', CURRENT_DATE + INTERVAL '1 day', demo_presenter_1_id, '{"copy": "Check out our premium headphones!", "brief": "Highlight quality and features"}'::jsonb, 'scheduled'),
    (demo_calendar_version_id, 'instagram', CURRENT_DATE + INTERVAL '2 days', demo_presenter_1_id, '{"copy": "New tech just dropped!", "brief": "Showcase latest products"}'::jsonb, 'scheduled'),
    (demo_calendar_version_id, 'meta', CURRENT_DATE + INTERVAL '3 days', demo_presenter_2_id, '{"copy": "Style update!", "brief": "Fashion-forward content"}'::jsonb, 'draft'),
    (demo_calendar_version_id, 'tiktok', CURRENT_DATE + INTERVAL '4 days', demo_presenter_2_id, '{"copy": "Trending now!", "brief": "Viral-style content"}'::jsonb, 'draft');

  -- Create integrations
  INSERT INTO integrations (project_id, provider_type, status, config)
  VALUES
    (demo_project_id, 'meta', 'active', '{"account_id": "demo-meta-123"}'::jsonb),
    (demo_project_id, 'google_ads', 'active', '{"account_id": "demo-google-456"}'::jsonb),
    (demo_project_id, 'woocommerce', 'active', '{"store_url": "https://example.com"}'::jsonb),
    (demo_project_id, 'firecrawl', 'active', '{}'::jsonb);

  -- Create integration status
  INSERT INTO integration_status (integration_id, status, message)
  SELECT id, 'healthy', 'All systems operational'
  FROM integrations
  WHERE project_id = demo_project_id;

  -- Create characters
  INSERT INTO characters (id, project_id, name, description, character_image_path, character_data)
  VALUES
    (
      gen_random_uuid(),
      demo_project_id,
      'Sarah - Friendly Expert',
      'Warm and knowledgeable product expert',
      demo_project_id::text || '/characters/sarah.jpg',
      '{"age": 28, "personality": "friendly", "style": "professional"}'::jsonb
    ) RETURNING id INTO demo_character_1_id,
    (
      gen_random_uuid(),
      demo_project_id,
      'Mike - Tech Reviewer',
      'Tech-savvy reviewer with honest opinions',
      demo_project_id::text || '/characters/mike.jpg',
      '{"age": 32, "personality": "analytical", "style": "casual"}'::jsonb
    ) RETURNING id INTO demo_character_2_id;

  -- Create UGC video
  INSERT INTO ugc_videos (
    id, project_id, product_id, character_id, location_text, voice_id, script_text,
    status, storage_path, storage_url, video_duration_seconds, generation_config, completed_at
  ) VALUES (
    gen_random_uuid(),
    demo_project_id,
    demo_product_1_id,
    demo_character_1_id,
    'בית קפה בצ''יאנג מאי',
    'elevenlabs-voice-001',
    'Check out these amazing headphones! Perfect sound quality and comfort.',
    'completed',
    demo_project_id::text || '/ugc-videos/video-001.mp4',
    'https://example.supabase.co/storage/v1/object/sign/ugc-videos/' || demo_project_id::text || '/ugc-videos/video-001.mp4?token=demo-token',
    30,
    '{"background_provider": "dalle3", "lip_sync_enabled": true}'::jsonb,
    NOW() - INTERVAL '1 hour'
  ) RETURNING id INTO demo_ugc_video_id;

  -- Create media assets
  INSERT INTO media_assets (project_id, storage_path, storage_bucket, file_type, file_size, mime_type, storage_url, is_public, prompt_lineage)
  VALUES
    (demo_project_id, demo_project_id::text || '/generated-assets/image-001.jpg', 'generated-assets', 'image', 245760, 'image/jpeg', 'https://example.supabase.co/storage/v1/object/public/generated-assets/' || demo_project_id::text || '/generated-assets/image-001.jpg', true, '{"prompt": "Premium headphones on modern desk", "provider": "dalle3"}'::jsonb),
    (demo_project_id, demo_project_id::text || '/generated-assets/video-001.mp4', 'generated-assets', 'video', 5242880, 'video/mp4', 'https://example.supabase.co/storage/v1/object/sign/generated-assets/' || demo_project_id::text || '/generated-assets/video-001.mp4?token=demo-token', false, '{"prompt": "Product showcase video", "provider": "sora"}'::jsonb);

END $$;


