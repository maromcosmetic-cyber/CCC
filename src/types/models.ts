// Shared domain models

export type Project = {
  id: string;
  user_id: string;
  name: string;
  website_url: string;
  monthly_budget_amount: number;
  monthly_budget_currency: string;
  target_regions: string[];
  languages: string[];
  primary_channels: string[];
  industry?: string;
  created_at: string;
  updated_at: string;
};

export type ScrapeRun = {
  id: string;
  project_id: string;
  version: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  config: Record<string, any>;
  created_at: string;
};

export type ScrapePage = {
  id: string;
  scrape_run_id: string;
  url: string;
  title?: string;
  content?: string;
  html_content?: string;
  page_type?: 'home' | 'product' | 'legal' | 'about' | 'contact' | 'other';
  evidence_snippets: EvidenceSnippet[];
  storage_path?: string;
  created_at: string;
};

export type EvidenceSnippet = {
  text: string;
  url: string;
  page_id?: string;
};

export type CompanyProfile = {
  id: string;
  project_id: string;
  version: number;
  locked_at?: string;
  locked_by?: string;
  profile_data: {
    brand_identity?: {
      name?: string;
      tagline?: string;
      values?: string[];
    };
    legal_pages_map?: Record<string, string>;
    product_catalog_map?: Record<string, any>;
  };
  evidence_refs: EvidenceReference[];
  storage_path?: string;
  created_at: string;
};

export type EvidenceReference = {
  source_url: string;
  snippet: string;
  page_id?: string;
};

export type Product = {
  id: string;
  project_id: string;
  source_id?: string;
  name: string;
  description?: string;
  price?: number;
  currency: string;
  stock_status?: 'in_stock' | 'out_of_stock' | 'on_backorder';
  images: ProductImage[];
  metadata: Record<string, any>;
  synced_at?: string;
  created_at: string;
  updated_at: string;
};

export type ProductImage = {
  url: string;
  alt?: string;
};

export type AudienceSegment = {
  id: string;
  project_id: string;
  version: number;
  name: string;
  description?: string;
  company_profile_version_id?: string;
  user_prompt?: string;
  ai_enhanced_prompt?: string;
  targeting: TargetingConfig;
  platform_specific_configs: PlatformConfigs;
  ai_suggested: boolean;
  evidence_refs: EvidenceReference[];
  created_at: string;
};

export type TargetingConfig = {
  demographics?: {
    age_min?: number;
    age_max?: number;
    gender?: string[];
    locations?: string[];
  };
  interests?: string[];
  behaviors?: string[];
  radius?: {
    center: { lat: number; lng: number };
    radius_km: number;
  };
  geographic?: string[];
};

export type PlatformConfigs = {
  meta?: Record<string, any>;
  google_ads?: Record<string, any>;
  lazada?: Record<string, any>;
  tiktok?: Record<string, any>;
};

export type Campaign = {
  id: string;
  project_id: string;
  platform: 'meta' | 'google_ads' | 'lazada' | 'tiktok';
  name: string;
  description?: string;
  external_campaign_id?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  budget_amount?: number;
  budget_currency: string;
  targeting_config: {
    audience_segment_id?: string;
    demographics?: any;
    interests?: any;
  };
  creative_kit_id?: string;
  product_id?: string;
  start_date?: string;
  end_date?: string;
  insights_data: CampaignInsights;
  created_at: string;
  updated_at: string;
  last_synced_at?: string;
};

export type CampaignInsights = {
  impressions?: number;
  clicks?: number;
  spend?: number;
  conversions?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
};

export type Presenter = {
  id: string;
  project_id: string;
  version: number;
  name: string;
  description?: string;
  audience_segment_id?: string;
  voice_attributes: {
    tone?: string;
    style?: string;
    personality?: string;
  };
  example_posts: any[];
  created_at: string;
};

export type Strategy = {
  id: string;
  project_id: string;
  version: number;
  company_profile_version_id?: string;
  strategy_data: {
    goals?: string[];
    channels?: string[];
    messaging?: string;
    cadence?: string;
    budget_allocation?: Record<string, number>;
  };
  evidence_refs: EvidenceReference[];
  created_at: string;
};

export type CalendarVersion = {
  id: string;
  project_id: string;
  version: number;
  strategy_version_id?: string;
  weeks: number;
  start_date: string;
  created_at: string;
};

export type CalendarPost = {
  id: string;
  calendar_version_id: string;
  channel: string;
  scheduled_date: string;
  presenter_id?: string;
  post_data: {
    copy?: string;
    brief?: string;
    assets?: string[];
  };
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  created_at: string;
};

export type CreativeKit = {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  campaign_id?: string;
  product_id?: string;
  audience_segment_id?: string;
  created_at: string;
};

export type MediaAsset = {
  id: string;
  project_id: string;
  storage_path: string;
  storage_bucket: string;
  file_type: string;
  file_size?: number;
  mime_type?: string;
  storage_url?: string;
  is_public: boolean;
  prompt_lineage: Record<string, any>;
  provider_call_id?: string;
  approved: boolean;
  created_at: string;
};

export type UGCVideo = {
  id: string;
  project_id: string;
  product_id?: string;
  character_id?: string;
  location_text: string;
  voice_id: string;
  script_text: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  storage_path?: string;
  storage_url?: string;
  video_duration_seconds?: number;
  generation_config: {
    background_provider?: string;
    lip_sync_enabled?: boolean;
  };
  created_at: string;
  completed_at?: string;
};

export type Character = {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  character_image_path?: string;
  character_data: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export type VideoGenerationJob = {
  id: string;
  ugc_video_id: string;
  step: 'background_gen' | 'character_video' | 'tts' | 'lip_sync' | 'composite' | 'upload';
  status: 'pending' | 'running' | 'completed' | 'failed';
  input_data: Record<string, any>;
  output_data: Record<string, any>;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
};

export type Integration = {
  id: string;
  project_id: string;
  provider_type: 'meta' | 'google_ads' | 'lazada' | 'tiktok' | 'woocommerce' | 'whatsapp' | 'firecrawl' | 'llm' | 'image' | 'video' | 'elevenlabs' | 'synclabs' | 'google_analytics' | 'google_business' | 'microsoft_clarity' | 'wordpress';
  credentials_encrypted?: string;
  status: 'active' | 'inactive' | 'error';
  last_sync_at?: string;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export type IntegrationStatus = {
  integration_id: string;
  status: 'healthy' | 'degraded' | 'down';
  message?: string;
  last_checked_at: string;
};

export type PromptTemplate = {
  id: string;
  name: string;
  version: number;
  variables: string[];
  json_schema: Record<string, any>;
  template_text: string;
  created_at: string;
};

export type PromptRun = {
  id: string;
  project_id?: string;
  template_id?: string;
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  tokens_used?: number;
  cost?: number;
  latency_ms?: number;
  status: 'pending' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
};

export type JobRun = {
  id: string;
  project_id?: string;
  job_type: string;
  job_data: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  logs: string[];
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
};

export type CostLedgerEntry = {
  id: string;
  project_id?: string;
  provider_type: string;
  provider_call_id?: string;
  cost_amount: number;
  cost_currency: string;
  metadata: Record<string, any>;
  created_at: string;
};

export type AuditLogEntry = {
  id: string;
  project_id?: string;
  event_type: string;
  actor_id?: string;
  actor_type: 'user' | 'whatsapp' | 'worker';
  source: 'ui' | 'whatsapp' | 'worker';
  payload: Record<string, any>;
  created_at: string;
};


