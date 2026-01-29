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
  pain_points?: string[];
  desires?: string[];
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

// Product Image Generation Types
export type ImageType = 'product_only' | 'product_persona' | 'ugc_style';

export type AudienceImageGeneration = {
  id: string;
  project_id: string;
  audience_id: string;
  persona_name?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  config: AudienceImageGenerationConfig;
  generated_images: GeneratedImage[];
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
};

export type AudienceImageGenerationConfig = {
  product_ids: string[];
  campaign_id?: string;
  image_types?: ImageType[];
  variations_per_type?: number | {
    product_only?: number;
    product_persona?: number;
    ugc_style?: number;
  };
  platform?: string;
  funnel_stage?: string;
  angle?: string;
};

export type GeneratedImage = {
  id: string;
  image_type: ImageType;
  product_ids: string[];
  storage_path: string;
  storage_bucket: string;
  storage_url: string;
  metadata: ImageMetadata;
  created_at: string;
};

export type ImageMetadata = {
  audience_id: string;
  persona_name?: string;
  campaign_id?: string;
  platform?: string;
  funnel_stage?: string;
  angle?: string;
  prompt?: string;
  generation_steps?: Record<string, any>;
  quality_validation?: QualityValidationResult;
};

export type QualityValidationResult = {
  passed: boolean;
  checks: {
    product_fidelity?: boolean;
    brand_compliance?: boolean;
    persona_accuracy?: boolean;
    realism?: boolean;
    no_ai_artifacts?: boolean;
  };
  errors?: string[];
  warnings?: string[];
};

// Brand Identity Playbook (simplified structure matching the stored JSONB)
export type BrandIdentityPlaybook = {
  dna?: Record<string, any>;
  product?: Record<string, any>;
  audience?: Record<string, any>;
  positioning?: Record<string, any>;
  market?: Record<string, any>;
  offer?: Record<string, any>;
  journey?: Record<string, any>;
  narrative?: Record<string, any>;
  pain_matrix?: Record<string, any> | any[];
  content_pillars?: Record<string, any> | any[];
  trust_infrastructure?: Record<string, any>;
  community_model?: Record<string, any>;
  platform_strategy?: Record<string, any>;
  long_term_vision?: Record<string, any>;
  kpis_optimization?: Record<string, any>;
  ai_autonomy_rules?: Record<string, any>;
  voice?: Record<string, any>;
  guardrails?: Record<string, any>;
  visual?: {
    colors?: {
      primary?: Array<{ hex: string; name?: string }>;
      secondary?: Array<{ hex: string; name?: string }>;
      accent?: Array<{ hex: string; name?: string }>;
    };
    typography?: Record<string, any>;
    logo?: Record<string, any>;
    image_style?: string;
    mood?: string;
  };
  personas?: Record<string, PersonaProfile>;
  [key: string]: any; // Allow additional properties
};

export type PersonaProfile = {
  name: string;
  role?: string;
  age_range?: string;
  occupation?: string;
  emotional_state?: string;
  core_concerns?: string;
  personality_traits?: string[];
  visual_style?: string;
  communication_style?: string;
  trust_signals?: string;
  avoid_traits?: string;
  casting_notes?: string;
  image_prompt?: string;
  imageUrl?: string;
  [key: string]: any;
};

export type PersonaContext = {
  persona: PersonaProfile;
  audience: AudienceSegment;
};

export type AudienceContext = {
  audience: AudienceSegment;
  persona?: PersonaProfile;
};

export type ScenePlanningResult = {
  scene_description: string;
  mood: string;
  lighting: string;
  color_harmony: string[];
  composition_notes?: string;
  style_guidelines?: string[];
  // Scene-aware generation fields
  persona_attire_adaptation?: string;  // What the persona should wear for this scene
  product_placement_zone?: 'left' | 'right' | 'center' | 'bottom-left' | 'bottom-right';
  product_scale_hint?: 'small' | 'medium' | 'large';
  scene_type?: 'shower' | 'bathroom' | 'living_room' | 'kitchen' | 'outdoor' | 'studio' | 'other';
  // Product-in-use action (e.g., "pouring shampoo into palm", "applying cream to face")
  product_action?: string;
};

export type ProductPersonaResult = {
  isolated_product: {
    original_image: string;
    isolated_image?: string;
  };
  final_image: {
    url: string;
    base64?: string;
    width?: number;
    height?: number;
  };
  scene_plan: ScenePlanningResult;
  overlay_image: string;
};

// Extended MediaAsset with audience-specific fields
export type MediaAssetWithAudience = MediaAsset & {
  audience_id?: string;
  persona_name?: string;
  image_type?: ImageType;
  product_ids?: string[];
};


// Image Ads System Types

export type ImageLayoutMap = {
  safe_text_zones: Array<'top' | 'bottom' | 'left' | 'right' | 'center'>;
  avoid_zones: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  contrast_level: 'low' | 'medium' | 'high';
  visual_noise: 'low' | 'medium' | 'high';
  dominant_colors: string[];
  suggested_text_color?: string;
};

export type AdCreativeStrategy = {
  angle: 'problem_solution' | 'social_proof' | 'authority' | 'urgency' | 'benefit' | 'offer';
  emotional_tone: 'empathetic' | 'energetic' | 'urgent' | 'authoritative' | 'playful';
  message_density: 'minimal' | 'moderate' | 'detailed';
  risk_level: 'conservative' | 'bold';
  hook_concept: string;
  rationale: string;
};

export type VisualGuideline = {
  id: string;
  project_id: string;
  category: string;
  guideline_json: {
    market_patterns: {
      image_placement: 'center' | 'left' | 'right';
      text_hierarchy: 'headline_first' | 'support_first';
      cta_position: 'bottom' | 'center' | 'overlay';
      visual_density: 'minimal' | 'moderate' | 'busy';
      background_style: 'clean' | 'lifestyle' | 'gradient';
      dominant_colors: string[];
      composition_rules: string[];
    };
    performance_signals: {
      longevity_days: number;
      platform_coverage: string[];
      frequency_score: number;
    };
  };
  brand_alignment_json: {
    overrides: Record<string, any>; // Brand rules that override market
    adaptations: Record<string, any>; // How brand adapts market rules
  };
  created_at: string;
  updated_at: string;
};

export type AdTemplate = {
  id: string;
  project_id: string;
  guideline_id: string | null;
  name: string;
  template_type: 'static_image' | 'carousel' | 'video_thumbnail';
  platform: 'meta' | 'google' | 'tiktok' | 'instagram' | 'facebook';
  layout_json: {
    image_zones: Array<{
      id: string;
      position: string;
      dimensions: string;
      aspect_ratio?: string;
    }>;
    text_zones: Array<{
      id: string;
      type: 'headline' | 'hook' | 'body' | 'cta'; // Added 'hook'
      max_chars: number;
      position: string;
      font_size?: string;
      font_weight?: string;
      color_variable?: string; // e.g., 'primary', 'text-on-dark'
    }>;
    cta_position: string;
    safe_areas: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
    required_contrast?: 'high' | 'medium';
  };
  style_rules_json: {
    color_palette: string[];
    font_hierarchy: Record<string, any>;
    spacing_rules: Record<string, any>;
  };
  compatibility_map?: {
    allowed_angles?: string[];
    min_contrast?: string;
  };
  created_at: string;
  updated_at: string;
};

export type GeneratedAd = {
  id: string;
  project_id: string;
  template_id: string;
  audience_segment_id: string | null;
  product_id: string | null;
  ad_type: 'image' | 'carousel' | 'video';
  assets_json: {
    image_url: string;
    headline: string;
    body_copy: string;
    hook?: string; // Added hook
    cta: string;
    additional_images?: string[]; // For carousels
    rendered_image_url?: string; // Final rendered ad
  };
  metadata_json: {
    platform: string;
    dimensions: string;
    file_format: string;
    aspect_ratio?: string;
    strategy?: AdCreativeStrategy;
    image_analysis?: ImageLayoutMap;
    qa_results?: {
      passed: boolean;
      checks: Record<string, boolean>;
      issues?: string[];
    };
  };
  status: 'draft' | 'approved' | 'rejected' | 'archived'; // Added 'rejected'
  created_at: string;
  updated_at: string;
};

export type AdGenerationJob = {
  id: string;
  project_id: string;
  template_id: string;
  audience_segment_id: string;
  product_id: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  count: number;
  generated_ads: GeneratedAd[];
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
};


// ==========================================
// Product Images System Examples
// ==========================================

export type ProductImageIntent = 'primary_hero' | 'gallery_lifestyle' | 'ad_creative' | 'thumbnail';

export type BrandVisualIdentity = {
  project_id: string;
  lighting_weights: Record<string, number>; // e.g., { "softbox": 0.8, "natural": 0.2 }
  composition_weights: Record<string, number>;
  angle_weights: Record<string, number>;
  color_grading: {
    contrast: 'low' | 'medium' | 'high';
    saturation: 'low' | 'medium' | 'high';
    palette: string[];
  };
  approved_count: number;
  confidence_score: number;
  last_updated: string;
};

export type ProductImageGenerationConfig = {
  product_id: string;
  intent: ProductImageIntent;
  aspect_ratio: string;
  background_style?: string; // e.g. 'pure_white', 'luxury_living_room'
  reference_image_url?: string;
  exclude_elements?: string[];
};

export type ConversionScore = {
  total: number; // 0-100
  breakdown: {
    clarity: number;        // Product visibility
    brand_alignment: number; // Matches visual identity
    technical: number;      // Sharpness, artifacts
    composition: number;    // Rule of thirds etc
  };
  recommended_role?: ProductImageIntent;
  confidence: number; // 0.0 - 1.0
};

export type ProductImageSession = {
  id: string;
  project_id: string;
  product_id: string;
  intent: ProductImageIntent;
  status: 'planning' | 'generating' | 'completed' | 'failed';
  generated_images: GeneratedImage[];
  config_snapshot: ProductImageGenerationConfig;
  created_at: string;
};

// Extending GeneratedImage (or MediaAsset) implicitly via usage, 
// but we might want explicit types for the UI if they differ significantly.
// For now, we can piggyback on MediaAsset metadata or create a specific view model.

