// API request/response types

// Projects
export type CreateProjectRequest = {
  name: string;
  website_url: string;
  monthly_budget_amount: number;
  monthly_budget_currency?: string;
  target_regions?: string[];
  languages?: string[];
  primary_channels?: string[];
  industry?: string;
};

export type CreateProjectResponse = {
  project: {
    id: string;
    name: string;
    website_url: string;
    status: string;
  };
};

// Scrape
export type TriggerScrapeRequest = {
  config?: {
    max_pages?: number;
    include_legal?: boolean;
  };
};

export type TriggerScrapeResponse = {
  scrape_run_id: string;
  status: string;
};

export type GetScrapeStatusResponse = {
  scrape_run: {
    id: string;
    status: string;
    pages: Array<{
      id: string;
      url: string;
      title?: string;
      page_type?: string;
    }>;
  };
};

// Company Profile
export type LockCompanyProfileResponse = {
  company_profile: {
    id: string;
    version: number;
    locked_at: string;
  };
};

// Campaigns
export type ListCampaignsQuery = {
  platform?: string;
  status?: string;
};

export type CreateCampaignRequest = {
  platform: 'meta' | 'google_ads' | 'lazada' | 'tiktok';
  name: string;
  description?: string;
  budget_amount: number;
  budget_currency?: string;
  targeting_config: {
    audience_segment_id?: string;
    demographics?: any;
    interests?: any;
  };
  product_id?: string;
  start_date?: string;
  end_date?: string;
};

export type CreateCampaignResponse = {
  campaign_id: string;
};

export type GetCampaignResponse = {
  campaign: {
    id: string;
    name: string;
    platform: string;
    status: string;
    insights_data: Record<string, any>;
  };
};

export type SyncCampaignResponse = {
  success: boolean;
  insights_data: Record<string, any>;
};

// Audiences
export type GenerateAudienceRequest = {
  user_prompt?: string;
  company_profile_version_id?: string;
};

export type GenerateAudienceResponse = {
  audience_segment_id: string;
  status: string;
};

export type CreateAudienceRequest = {
  name: string;
  description?: string;
  targeting: Record<string, any>;
  platform_specific_configs?: Record<string, any>;
};

export type CreateAudienceResponse = {
  audience_segment_id: string;
};

export type GetAudienceResponse = {
  audience: {
    id: string;
    name: string;
    targeting: Record<string, any>;
    platform_specific_configs: Record<string, any>;
  };
};

// Strategy
export type GenerateStrategyRequest = {
  company_profile_version_id?: string;
};

export type GenerateStrategyResponse = {
  strategy_version_id: string;
  status: string;
};

// Calendar
export type GenerateCalendarRequest = {
  strategy_version_id: string;
  weeks?: number;
};

export type GenerateCalendarResponse = {
  calendar_version_id: string;
  status: string;
};

// UGC Videos
export type CreateUGCVideoRequest = {
  location_text: string;
  character_id?: string;
  voice_id: string;
  script_text: string;
  product_id: string;
  generation_config?: {
    background_provider?: string;
    lip_sync_enabled?: boolean;
  };
};

export type CreateUGCVideoResponse = {
  ugc_video_id: string;
  status: string;
};

export type GetUGCVideoResponse = {
  video: {
    id: string;
    status: string;
    storage_url?: string;
    progress?: {
      step: string;
      status: string;
    };
  };
};

export type CreateCharacterRequest = {
  name: string;
  description?: string;
  character_image_path?: string;
  character_data?: Record<string, any>;
};

export type CreateCharacterResponse = {
  character_id: string;
};

// Assets
export type GenerateAssetsRequest = {
  post_id: string;
  asset_types?: string[];
};

export type GenerateAssetsResponse = {
  job_id: string;
  status: string;
};

// Export
export type ExportResponse = {
  data: any;
  format: 'json' | 'csv';
};

// Control
export type ControlStatusResponse = {
  integrations: Array<{
    provider_type: string;
    status: string;
    message?: string;
  }>;
  system_health: 'healthy' | 'degraded' | 'down';
};

// WhatsApp
export type WhatsAppWebhookRequest = {
  message: string;
  from: string;
  timestamp: string;
};

export type WhatsAppWebhookResponse = {
  response: string;
  requires_confirmation?: boolean;
};

// Bot Query
export type BotQueryRequest = {
  query: string;
  project_id: string;
};

export type BotQueryResponse = {
  answer: string;
  evidence_refs?: Array<{
    source_url: string;
    snippet: string;
  }>;
};


