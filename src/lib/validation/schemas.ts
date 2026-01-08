import { z } from 'zod';

// Project schemas
export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  website_url: z.string().url('Invalid URL'),
  monthly_budget_amount: z.number().positive('Budget must be positive'),
  monthly_budget_currency: z.string().default('USD'),
  target_regions: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  primary_channels: z.array(z.string()).optional(),
  industry: z.string().optional(),
});

export const ScrapeConfigSchema = z.object({
  max_pages: z.number().int().positive().optional(),
  include_legal: z.boolean().optional(),
});

// Company Profile schemas
export const CompanyProfileSchema = z.object({
  profile_data: z.object({
    brand_identity: z.object({
      name: z.string().optional(),
      tagline: z.string().optional(),
      values: z.array(z.string()).optional(),
    }).optional(),
    legal_pages_map: z.record(z.string()).optional(),
    product_catalog_map: z.record(z.any()).optional(),
  }),
  evidence_refs: z.array(z.object({
    source_url: z.string(),
    snippet: z.string(),
    page_id: z.string().optional(),
  })).optional(),
});

// Campaign schemas
export const CreateCampaignSchema = z.object({
  platform: z.enum(['meta', 'google_ads', 'lazada', 'tiktok']),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  budget_amount: z.number().positive('Budget must be positive'),
  budget_currency: z.string().default('USD'),
  targeting_config: z.object({
    audience_segment_id: z.string().uuid().optional(),
    demographics: z.any().optional(),
    interests: z.any().optional(),
  }),
  product_id: z.string().uuid().optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
});

export const UpdateCampaignSchema = CreateCampaignSchema.partial();

// Audience schemas
export const GenerateAudienceSchema = z.object({
  user_prompt: z.string().optional(),
  company_profile_version_id: z.string().uuid().optional(),
});

export const CreateAudienceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  targeting: z.object({
    demographics: z.object({
      age_min: z.number().int().optional(),
      age_max: z.number().int().optional(),
      gender: z.array(z.string()).optional(),
      locations: z.array(z.string()).optional(),
    }).optional(),
    interests: z.array(z.string()).optional(),
    behaviors: z.array(z.string()).optional(),
    radius: z.object({
      center: z.object({
        lat: z.number(),
        lng: z.number(),
      }),
      radius_km: z.number().positive(),
    }).optional(),
    geographic: z.array(z.string()).optional(),
  }),
  platform_specific_configs: z.record(z.any()).optional(),
});

export const UpdateAudienceSchema = CreateAudienceSchema.partial();

// Strategy schemas
export const StrategySchema = z.object({
  strategy_data: z.object({
    goals: z.array(z.string()).optional(),
    channels: z.array(z.string()).optional(),
    messaging: z.string().optional(),
    cadence: z.string().optional(),
    budget_allocation: z.record(z.number()).optional(),
  }),
  evidence_refs: z.array(z.object({
    source_url: z.string(),
    snippet: z.string(),
    page_id: z.string().optional(),
  })).optional(),
});

export const GenerateStrategySchema = z.object({
  company_profile_version_id: z.string().uuid().optional(),
});

// Calendar schemas
export const CalendarPostSchema = z.object({
  channel: z.string(),
  scheduled_date: z.string().date(),
  presenter_id: z.string().uuid().optional(),
  post_data: z.object({
    copy: z.string().optional(),
    brief: z.string().optional(),
    assets: z.array(z.string()).optional(),
  }),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']).default('draft'),
});

export const GenerateCalendarSchema = z.object({
  strategy_version_id: z.string().uuid(),
  weeks: z.number().int().positive().max(12).default(4),
});

// UGC Video schemas
export const CreateUGCVideoSchema = z.object({
  location_text: z.string().min(1, 'Location is required'),
  character_id: z.string().uuid().optional(),
  voice_id: z.string().min(1, 'Voice ID is required'),
  script_text: z.string().min(1, 'Script is required'),
  product_id: z.string().uuid(),
  generation_config: z.object({
    background_provider: z.string().optional(),
    lip_sync_enabled: z.boolean().optional(),
  }).optional(),
});

export const CreateCharacterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  character_image_path: z.string().optional(),
  character_data: z.record(z.any()).optional(),
});

// Media Asset schemas
export const MediaAssetSchema = z.object({
  storage_path: z.string(),
  storage_bucket: z.string(),
  file_type: z.string(),
  file_size: z.number().optional(),
  mime_type: z.string().optional(),
  storage_url: z.string().optional(),
  is_public: z.boolean().default(false),
  prompt_lineage: z.record(z.any()).optional(),
  provider_call_id: z.string().uuid().optional(),
  approved: z.boolean().default(false),
});

// WhatsApp schemas
export const WhatsAppWebhookSchema = z.object({
  message: z.string(),
  from: z.string(),
  timestamp: z.string(),
});

// Bot Query schemas
export const BotQuerySchema = z.object({
  query: z.string().min(1, 'Query is required'),
  project_id: z.string().uuid(),
});

// Export schemas
export const ExportQuerySchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
});


