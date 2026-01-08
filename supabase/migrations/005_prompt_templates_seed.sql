-- Seed prompt templates

INSERT INTO prompt_templates (name, version, variables, json_schema, template_text)
VALUES
  (
    'COMPANY_PROFILE_FROM_SCRAPE',
    1,
    '["scraped_content", "website_url"]'::jsonb,
    '{
      "type": "object",
      "properties": {
        "brand_identity": {
          "type": "object",
          "properties": {
            "name": {"type": "string"},
            "tagline": {"type": "string"},
            "values": {"type": "array", "items": {"type": "string"}},
            "mission": {"type": "string"},
            "target_audience": {"type": "string"}
          }
        },
        "legal_pages_map": {
          "type": "object",
          "additionalProperties": {"type": "string"}
        },
        "product_catalog_map": {
          "type": "object",
          "properties": {
            "categories": {"type": "array", "items": {"type": "string"}},
            "product_types": {"type": "array", "items": {"type": "string"}},
            "price_range": {"type": "object"}
          }
        },
        "policies": {
          "type": "object",
          "properties": {
            "return_policy": {"type": "string"},
            "shipping_policy": {"type": "string"},
            "privacy_policy_summary": {"type": "string"}
          }
        }
      },
      "required": ["brand_identity"]
    }'::jsonb,
    'You are an expert brand analyst. Analyze the following scraped website content and extract structured information about the company.

Website URL: {{website_url}}

Scraped Content:
{{scraped_content}}

Extract and structure the following information:
1. Brand Identity: company name, tagline, core values, mission statement, target audience
2. Legal Pages Map: URLs and summaries of Terms of Service, Privacy Policy, Returns Policy, Shipping Policy
3. Product Catalog Map: categories, product types, price ranges
4. Policies: return policy, shipping policy, privacy policy summary

CRITICAL RULES:
- Only include information that is EVIDENCED in the scraped content
- Mark any inferred information clearly as "inferred"
- Include evidence references: {source_url, snippet, page_id} for each claim
- Do NOT invent pricing, certifications, or guarantees
- If information is missing, state "not found in scraped content"

Return a JSON object matching the provided schema.'
  ),
  (
    'AUDIENCE_SEGMENTATION',
    1,
    '["company_profile", "user_prompt", "enhanced_prompt"]'::jsonb,
    '{
      "type": "object",
      "properties": {
        "segments": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": {"type": "string"},
              "description": {"type": "string"},
              "targeting": {
                "type": "object",
                "properties": {
                  "demographics": {
                    "type": "object",
                    "properties": {
                      "age_min": {"type": "number"},
                      "age_max": {"type": "number"},
                      "gender": {"type": "array", "items": {"type": "string"}},
                      "locations": {"type": "array", "items": {"type": "string"}}
                    }
                  },
                  "interests": {"type": "array", "items": {"type": "string"}},
                  "behaviors": {"type": "array", "items": {"type": "string"}}
                }
              },
              "platform_configs": {
                "type": "object",
                "properties": {
                  "meta": {"type": "object"},
                  "google_ads": {"type": "object"},
                  "lazada": {"type": "object"},
                  "tiktok": {"type": "object"}
                }
              }
            },
            "required": ["name", "targeting"]
          }
        }
      },
      "required": ["segments"]
    }'::jsonb,
    'You are a marketing audience segmentation expert. Based on the company profile and user requirements, create detailed audience segments.

Company Profile:
{{company_profile}}

User Prompt: {{user_prompt}}

AI-Enhanced Prompt: {{enhanced_prompt}}

Create 2-4 audience segments that align with the company''s brand identity and target market. For each segment:

1. Define clear demographics (age, gender, locations)
2. Identify relevant interests and behaviors
3. Provide platform-specific configurations for:
   - Meta (Facebook/Instagram): interests, behaviors, lookalike audiences
   - Google Ads: keywords, demographics, in-market segments
   - Lazada: product interests, shopping behaviors
   - TikTok: interests, behaviors, video engagement patterns

CRITICAL RULES:
- Base segments on company profile data (evidenced)
- Use enhanced prompt to refine targeting
- Include evidence references linking to company profile data
- Do NOT create segments that don''t align with the brand
- Provide realistic audience sizes and targeting parameters

Return a JSON object with an array of audience segments matching the provided schema.'
  ),
  (
    'PRESENTER_DEFINITION',
    1,
    '["company_profile", "audience_segment"]'::jsonb,
    '{
      "type": "object",
      "properties": {
        "presenters": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": {"type": "string"},
              "description": {"type": "string"},
              "voice_attributes": {
                "type": "object",
                "properties": {
                  "tone": {"type": "string"},
                  "style": {"type": "string"},
                  "personality": {"type": "string"}
                }
              },
              "example_posts": {
                "type": "array",
                "items": {"type": "string"}
              }
            },
            "required": ["name", "voice_attributes"]
          }
        }
      },
      "required": ["presenters"]
    }'::jsonb,
    'You are a brand voice expert. Define brand voice personas (presenters) that will represent the company in content.

Company Profile:
{{company_profile}}

Target Audience Segment:
{{audience_segment}}

Create 1-2 presenter personas that:
1. Align with the company''s brand identity and values
2. Resonate with the target audience segment
3. Have distinct voice attributes (tone, style, personality)
4. Include example posts that demonstrate the voice

CRITICAL RULES:
- Base personas on company brand identity (evidenced)
- Ensure personas are consistent with brand values
- Provide realistic example posts
- Do NOT create personas that contradict the brand

Return a JSON object with an array of presenters matching the provided schema.'
  ),
  (
    'UNIFIED_STRATEGY_BUDGETED',
    1,
    '["company_profile", "monthly_budget", "budget_currency", "target_regions", "primary_channels"]'::jsonb,
    '{
      "type": "object",
      "properties": {
        "goals": {"type": "array", "items": {"type": "string"}},
        "channels": {"type": "array", "items": {"type": "string"}},
        "messaging": {"type": "string"},
        "cadence": {"type": "string"},
        "budget_allocation": {
          "type": "object",
          "additionalProperties": {"type": "number"}
        },
        "content_themes": {"type": "array", "items": {"type": "string"}},
        "key_metrics": {"type": "array", "items": {"type": "string"}}
      },
      "required": ["goals", "channels", "messaging"]
    }'::jsonb,
    'You are a marketing strategy expert. Create a comprehensive marketing strategy constrained by budget and business context.

Company Profile:
{{company_profile}}

Monthly Budget: {{monthly_budget}} {{budget_currency}}
Target Regions: {{target_regions}}
Primary Channels: {{primary_channels}}

Create a unified marketing strategy that includes:
1. Clear goals aligned with budget
2. Channel selection and allocation
3. Core messaging that reflects brand identity
4. Content cadence recommendations
5. Budget allocation across channels
6. Content themes
7. Key metrics to track

CRITICAL RULES:
- Budget allocation must sum to 100% across selected channels
- Strategy must be realistic for the budget amount
- Base messaging on company profile (evidenced)
- Include evidence references for strategy decisions
- Do NOT exceed budget constraints

Return a JSON object matching the provided schema.'
  ),
  (
    'CALENDAR_GENERATION_4W',
    1,
    '["strategy", "weeks", "start_date", "presenters"]'::jsonb,
    '{
      "type": "object",
      "properties": {
        "posts": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "channel": {"type": "string"},
              "scheduled_date": {"type": "string"},
              "copy": {"type": "string"},
              "brief": {"type": "string"},
              "presenter_id": {"type": "string"},
              "asset_requirements": {
                "type": "object",
                "properties": {
                  "images": {"type": "array", "items": {"type": "string"}},
                  "videos": {"type": "array", "items": {"type": "string"}}
                }
              }
            },
            "required": ["channel", "scheduled_date", "copy"]
          }
        }
      },
      "required": ["posts"]
    }'::jsonb,
    'You are a content calendar planner. Generate a {{weeks}}-week content calendar based on the marketing strategy.

Strategy:
{{strategy}}

Start Date: {{start_date}}
Available Presenters:
{{presenters}}

Create a detailed content calendar with:
1. Posts for multiple channels (at least 2 different channels)
2. Scheduled dates
3. Post copy (engaging, on-brand)
4. Creative brief for each post
5. Asset requirements (images, videos)
6. Presenter assignment

CRITICAL RULES:
- Ensure variety across channels and content types
- Align all content with strategy messaging
- Distribute posts evenly across the {{weeks}} weeks
- Include mix of educational, promotional, and engagement content
- Base content on strategy (evidenced)
- Do NOT create generic content

Return a JSON object with an array of calendar posts matching the provided schema.'
  ),
  (
    'CREATIVE_KIT_GENERATION',
    1,
    '["product", "audience_segment", "campaign", "presenter"]'::jsonb,
    '{
      "type": "object",
      "properties": {
        "kit_name": {"type": "string"},
        "description": {"type": "string"},
        "assets": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "type": {"type": "string", "enum": ["image", "video", "copy", "script"]},
              "prompt": {"type": "string"},
              "specifications": {"type": "object"}
            },
            "required": ["type", "prompt"]
          }
        }
      },
      "required": ["kit_name", "assets"]
    }'::jsonb,
    'You are a creative director. Generate a comprehensive creative kit for an ad campaign.

Product:
{{product}}

Target Audience:
{{audience_segment}}

Campaign Context:
{{campaign}}

Presenter Voice:
{{presenter}}

Create a creative kit that includes:
1. Multiple image assets with detailed prompts
2. Video concepts with shot lists
3. Ad copy variations
4. UGC script ideas

CRITICAL RULES:
- All creatives must align with product features and audience interests
- Use presenter voice for copy
- Include specific, detailed prompts for image/video generation
- Base creative direction on audience and product (evidenced)
- Do NOT create generic creative briefs

Return a JSON object matching the provided schema.'
  ),
  (
    'POST_COPY_AND_BRIEF',
    1,
    '["product", "audience_segment", "presenter", "channel"]'::jsonb,
    '{
      "type": "object",
      "properties": {
        "copy": {"type": "string"},
        "brief": {"type": "string"},
        "hashtags": {"type": "array", "items": {"type": "string"}},
        "call_to_action": {"type": "string"}
      },
      "required": ["copy", "brief"]
    }'::jsonb,
    'You are a social media copywriter. Write engaging post copy and creative brief.

Product:
{{product}}

Target Audience:
{{audience_segment}}

Presenter Voice:
{{presenter}}

Channel: {{channel}}

Create:
1. Engaging post copy (optimized for {{channel}})
2. Creative brief for visual assets
3. Relevant hashtags
4. Clear call-to-action

CRITICAL RULES:
- Match presenter voice and tone
- Optimize for {{channel}} best practices
- Include product benefits relevant to audience
- Base copy on product and audience data (evidenced)
- Do NOT use generic marketing language

Return a JSON object matching the provided schema.'
  ),
  (
    'IMAGE_PROMPT',
    1,
    '["product", "context", "style_preference"]'::jsonb,
    '{
      "type": "object",
      "properties": {
        "prompt": {"type": "string"},
        "style": {"type": "string"},
        "composition": {"type": "string"},
        "color_palette": {"type": "array", "items": {"type": "string"}}
      },
      "required": ["prompt"]
    }'::jsonb,
    'You are an image generation prompt engineer. Create a detailed prompt for AI image generation.

Product:
{{product}}

Context: {{context}}
Style Preference: {{style_preference}}

Create a detailed image generation prompt that includes:
1. Main subject and composition
2. Style and aesthetic
3. Color palette
4. Lighting and mood
5. Technical specifications

CRITICAL RULES:
- Be specific and detailed for best results
- Include product features naturally
- Match style to brand identity
- Do NOT include text in image descriptions (text is added separately)

Return a JSON object matching the provided schema.'
  ),
  (
    'UGC_SCRIPT',
    1,
    '["product", "location", "character", "duration_seconds"]'::jsonb,
    '{
      "type": "object",
      "properties": {
        "script": {"type": "string"},
        "duration_seconds": {"type": "number"},
        "scenes": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "timestamp": {"type": "number"},
              "action": {"type": "string"},
              "dialogue": {"type": "string"}
            }
          }
        },
        "product_showcase_timing": {"type": "number"}
      },
      "required": ["script"]
    }'::jsonb,
    'You are a UGC video script writer. Create a natural, authentic user-generated content script.

Product:
{{product}}

Location: {{location}}
Character: {{character}}
Target Duration: {{duration_seconds}} seconds

Create a UGC-style script that:
1. Feels authentic and unscripted
2. Showcases the product naturally
3. Includes dialogue that matches the character
4. Has clear scene structure
5. Highlights key product benefits

CRITICAL RULES:
- Script should feel like genuine user content, not advertising
- Include natural pauses and reactions
- Match character personality
- Base script on actual product features (evidenced)
- Do NOT use overly promotional language

Return a JSON object matching the provided schema.'
  )
ON CONFLICT (name, version) DO NOTHING;


