// Prompt Template Registry

import {
  COMPANY_PROFILE_SCHEMA,
  AUDIENCE_SEGMENTATION_SCHEMA,
  PRESENTER_DEFINITION_SCHEMA,
  UNIFIED_STRATEGY_SCHEMA,
  CALENDAR_GENERATION_SCHEMA,
  CREATIVE_KIT_SCHEMA,
  POST_COPY_SCHEMA,
  IMAGE_PROMPT_SCHEMA,
  UGC_SCRIPT_SCHEMA,
} from './schemas';

export interface PromptTemplate {
  name: string;
  version: number;
  variables: string[];
  json_schema: Record<string, any>;
  template_text: string;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    name: 'COMPANY_PROFILE_FROM_SCRAPE',
    version: 1,
    variables: ['scraped_content', 'website_url'],
    json_schema: COMPANY_PROFILE_SCHEMA,
    template_text: `You are an expert brand analyst. Analyze the following scraped website content and extract structured information about the company.

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

Return a JSON object matching the provided schema.`,
  },
  {
    name: 'AUDIENCE_SEGMENTATION',
    version: 1,
    variables: ['company_profile', 'user_prompt', 'enhanced_prompt'],
    json_schema: AUDIENCE_SEGMENTATION_SCHEMA,
    template_text: `You are a marketing audience segmentation expert. Based on the company profile and user requirements, create detailed audience segments.

Company Profile:
{{company_profile}}

User Prompt: {{user_prompt}}

AI-Enhanced Prompt: {{enhanced_prompt}}

Create 2-4 audience segments that align with the company's brand identity and target market. For each segment:

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
- Do NOT create segments that don't align with the brand
- Provide realistic audience sizes and targeting parameters

Return a JSON object with an array of audience segments matching the provided schema.`,
  },
  {
    name: 'PRESENTER_DEFINITION',
    version: 1,
    variables: ['company_profile', 'audience_segment'],
    json_schema: PRESENTER_DEFINITION_SCHEMA,
    template_text: `You are a brand voice expert. Define brand voice personas (presenters) that will represent the company in content.

Company Profile:
{{company_profile}}

Target Audience Segment:
{{audience_segment}}

Create 1-2 presenter personas that:
1. Align with the company's brand identity and values
2. Resonate with the target audience segment
3. Have distinct voice attributes (tone, style, personality)
4. Include example posts that demonstrate the voice

CRITICAL RULES:
- Base personas on company brand identity (evidenced)
- Ensure personas are consistent with brand values
- Provide realistic example posts
- Do NOT create personas that contradict the brand

Return a JSON object with an array of presenters matching the provided schema.`,
  },
  {
    name: 'UNIFIED_STRATEGY_BUDGETED',
    version: 1,
    variables: ['company_profile', 'monthly_budget', 'budget_currency', 'target_regions', 'primary_channels'],
    json_schema: UNIFIED_STRATEGY_SCHEMA,
    template_text: `You are a marketing strategy expert. Create a comprehensive marketing strategy constrained by budget and business context.

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

Return a JSON object matching the provided schema.`,
  },
  {
    name: 'CALENDAR_GENERATION_4W',
    version: 1,
    variables: ['strategy', 'weeks', 'start_date', 'presenters'],
    json_schema: CALENDAR_GENERATION_SCHEMA,
    template_text: `You are a content calendar planner. Generate a {{weeks}}-week content calendar based on the marketing strategy.

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

Return a JSON object with an array of calendar posts matching the provided schema.`,
  },
  {
    name: 'CREATIVE_KIT_GENERATION',
    version: 1,
    variables: ['product', 'audience_segment', 'campaign', 'presenter'],
    json_schema: CREATIVE_KIT_SCHEMA,
    template_text: `You are a creative director. Generate a comprehensive creative kit for an ad campaign.

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

Return a JSON object matching the provided schema.`,
  },
  {
    name: 'POST_COPY_AND_BRIEF',
    version: 1,
    variables: ['product', 'audience_segment', 'presenter', 'channel'],
    json_schema: POST_COPY_SCHEMA,
    template_text: `You are a social media copywriter. Write engaging post copy and creative brief.

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

Return a JSON object matching the provided schema.`,
  },
  {
    name: 'IMAGE_PROMPT',
    version: 1,
    variables: ['product', 'context', 'style_preference'],
    json_schema: IMAGE_PROMPT_SCHEMA,
    template_text: `You are an image generation prompt engineer. Create a detailed prompt for AI image generation.

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

Return a JSON object matching the provided schema.`,
  },
  {
    name: 'UGC_SCRIPT',
    version: 1,
    variables: ['product', 'location', 'character', 'duration_seconds'],
    json_schema: UGC_SCRIPT_SCHEMA,
    template_text: `You are a UGC video script writer. Create a natural, authentic user-generated content script.

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

Return a JSON object matching the provided schema.`,
  },
];

export function getTemplate(name: string, version?: number): PromptTemplate | undefined {
  return PROMPT_TEMPLATES.find(
    (t) => t.name === name && (version === undefined || t.version === version)
  );
}

export function getAllTemplates(): PromptTemplate[] {
  return PROMPT_TEMPLATES;
}


