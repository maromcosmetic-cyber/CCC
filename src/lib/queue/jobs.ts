// Job type definitions for pg-boss

export interface ScrapeJobData {
  project_id: string;
  scrape_run_id: string;
  website_url: string;
  config: {
    max_pages?: number;
    include_legal?: boolean;
  };
}

export interface CompanyProfileJobData {
  project_id: string;
  scrape_run_id: string;
  target_version?: number;
}

export interface AudienceJobData {
  project_id: string;
  user_prompt?: string;
  company_profile_version_id?: string;
  target_version?: number;
}

export interface StrategyJobData {
  project_id: string;
  company_profile_version_id?: string;
  target_version?: number;
}

export interface CalendarJobData {
  project_id: string;
  strategy_version_id: string;
  weeks?: number;
  target_version?: number;
}

export interface AssetsJobData {
  project_id: string;
  post_id: string;
  asset_types?: string[];
}

export interface UGCVideoJobData {
  project_id: string;
  ugc_video_id: string;
  location_text: string;
  character_id?: string;
  voice_id: string;
  script_text: string;
  product_id: string;
  generation_config?: {
    background_provider?: string;
    lip_sync_enabled?: boolean;
  };
}

export interface AudienceImageGenerationJobData {
  project_id: string;
  generation_id: string;
  audience_id: string;
  product_ids: string[];
  campaign_id?: string;
  image_types?: Array<'product_only' | 'product_persona' | 'ugc_style'>;
  variations_per_type?: number | {
    product_only?: number;
    product_persona?: number;
    ugc_style?: number;
  };
  platform?: string;
  funnel_stage?: string;
  angle?: string;
}

export interface AdGenerationJobData {
  project_id: string;
  job_id: string;
  template_id: string;
  audience_segment_id: string;
  image_id: string;
  image_url: string;
  image_path?: string;
  image_bucket?: string;
  headline?: string | null;
  body_copy?: string | null;
  hook?: string | null;
  cta?: string | null;
  layout_changes?: any | null;
  product_id?: string | null; // Legacy support
  count?: number; // Legacy support, defaults to 1
}

export type JobData =
  | ScrapeJobData
  | CompanyProfileJobData
  | AudienceJobData
  | StrategyJobData
  | CalendarJobData
  | AssetsJobData
  | UGCVideoJobData
  | AudienceImageGenerationJobData
  | AdGenerationJobData;

export const JOB_TYPES = {
  RUN_SCRAPE: 'run_scrape',
  BUILD_COMPANY_PROFILE: 'build_company_profile',
  GENERATE_AUDIENCE: 'generate_audience',
  GENERATE_STRATEGY: 'generate_strategy',
  GENERATE_CALENDAR: 'generate_calendar',
  GENERATE_ASSETS: 'generate_assets',
  GENERATE_UGC_VIDEO: 'generate_ugc_video',
  GENERATE_AUDIENCE_IMAGES: 'generate_audience_images',
  GENERATE_ADS: 'generate_ads',
} as const;

export type JobType = typeof JOB_TYPES[keyof typeof JOB_TYPES];



// Re-export getQueueClient for backward compatibility
export { getQueueClient } from './client';
