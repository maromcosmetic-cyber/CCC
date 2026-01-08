// JSON Schemas for prompt template outputs

export const COMPANY_PROFILE_SCHEMA = {
  type: 'object',
  properties: {
    brand_identity: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        tagline: { type: 'string' },
        values: { type: 'array', items: { type: 'string' } },
        mission: { type: 'string' },
        target_audience: { type: 'string' },
      },
    },
    legal_pages_map: {
      type: 'object',
      additionalProperties: { type: 'string' },
    },
    product_catalog_map: {
      type: 'object',
      properties: {
        categories: { type: 'array', items: { type: 'string' } },
        product_types: { type: 'array', items: { type: 'string' } },
        price_range: { type: 'object' },
      },
    },
    policies: {
      type: 'object',
      properties: {
        return_policy: { type: 'string' },
        shipping_policy: { type: 'string' },
        privacy_policy_summary: { type: 'string' },
      },
    },
  },
  required: ['brand_identity'],
};

export const AUDIENCE_SEGMENTATION_SCHEMA = {
  type: 'object',
  properties: {
    segments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          targeting: {
            type: 'object',
            properties: {
              demographics: {
                type: 'object',
                properties: {
                  age_min: { type: 'number' },
                  age_max: { type: 'number' },
                  gender: { type: 'array', items: { type: 'string' } },
                  locations: { type: 'array', items: { type: 'string' } },
                },
              },
              interests: { type: 'array', items: { type: 'string' } },
              behaviors: { type: 'array', items: { type: 'string' } },
            },
          },
          platform_configs: {
            type: 'object',
            properties: {
              meta: { type: 'object' },
              google_ads: { type: 'object' },
              lazada: { type: 'object' },
              tiktok: { type: 'object' },
            },
          },
        },
        required: ['name', 'targeting'],
      },
    },
  },
  required: ['segments'],
};

export const PRESENTER_DEFINITION_SCHEMA = {
  type: 'object',
  properties: {
    presenters: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          voice_attributes: {
            type: 'object',
            properties: {
              tone: { type: 'string' },
              style: { type: 'string' },
              personality: { type: 'string' },
            },
          },
          example_posts: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['name', 'voice_attributes'],
      },
    },
  },
  required: ['presenters'],
};

export const UNIFIED_STRATEGY_SCHEMA = {
  type: 'object',
  properties: {
    goals: { type: 'array', items: { type: 'string' } },
    channels: { type: 'array', items: { type: 'string' } },
    messaging: { type: 'string' },
    cadence: { type: 'string' },
    budget_allocation: {
      type: 'object',
      additionalProperties: { type: 'number' },
    },
    content_themes: { type: 'array', items: { type: 'string' } },
    key_metrics: { type: 'array', items: { type: 'string' } },
  },
  required: ['goals', 'channels', 'messaging'],
};

export const CALENDAR_GENERATION_SCHEMA = {
  type: 'object',
  properties: {
    posts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          channel: { type: 'string' },
          scheduled_date: { type: 'string' },
          copy: { type: 'string' },
          brief: { type: 'string' },
          presenter_id: { type: 'string' },
          asset_requirements: {
            type: 'object',
            properties: {
              images: { type: 'array', items: { type: 'string' } },
              videos: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        required: ['channel', 'scheduled_date', 'copy'],
      },
    },
  },
  required: ['posts'],
};

export const CREATIVE_KIT_SCHEMA = {
  type: 'object',
  properties: {
    kit_name: { type: 'string' },
    description: { type: 'string' },
    assets: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['image', 'video', 'copy', 'script'] },
          prompt: { type: 'string' },
          specifications: { type: 'object' },
        },
        required: ['type', 'prompt'],
      },
    },
  },
  required: ['kit_name', 'assets'],
};

export const POST_COPY_SCHEMA = {
  type: 'object',
  properties: {
    copy: { type: 'string' },
    brief: { type: 'string' },
    hashtags: { type: 'array', items: { type: 'string' } },
    call_to_action: { type: 'string' },
  },
  required: ['copy', 'brief'],
};

export const IMAGE_PROMPT_SCHEMA = {
  type: 'object',
  properties: {
    prompt: { type: 'string' },
    style: { type: 'string' },
    composition: { type: 'string' },
    color_palette: { type: 'array', items: { type: 'string' } },
  },
  required: ['prompt'],
};

export const UGC_SCRIPT_SCHEMA = {
  type: 'object',
  properties: {
    script: { type: 'string' },
    duration_seconds: { type: 'number' },
    scenes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          timestamp: { type: 'number' },
          action: { type: 'string' },
          dialogue: { type: 'string' },
        },
      },
    },
    product_showcase_timing: { type: 'number' },
  },
  required: ['script'],
};


