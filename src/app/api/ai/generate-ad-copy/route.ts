/**
 * Generate Ad Copy API
 * 
 * Generates ad copy (headline, body, CTA) using AI based on template and audience
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/auth/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { projectId, templateId, audienceId } = await request.json();

    if (!projectId || !templateId || !audienceId) {
      return NextResponse.json({ error: 'projectId, templateId, and audienceId are required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Load template
    const { data: template, error: templateError } = await supabase
      .from('ad_templates')
      .select('*')
      .eq('id', templateId)
      .eq('project_id', projectId)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Load audience
    const { data: audience, error: audienceError } = await supabase
      .from('audience_segments')
      .select('*')
      .eq('id', audienceId)
      .eq('project_id', projectId)
      .single();

    if (audienceError || !audience) {
      return NextResponse.json({ error: 'Audience not found' }, { status: 404 });
    }

    // Load brand identity
    const { data: project } = await supabase
      .from('projects')
      .select('brand_identity')
      .eq('id', projectId)
      .single();

    const brandIdentity = project?.brand_identity || {};

    // Get text zone constraints from template
    const headlineZone = template.layout_json?.text_zones?.find((z: any) => z.type === 'headline');
    const bodyZone = template.layout_json?.text_zones?.find((z: any) => z.type === 'body');
    const ctaZone = template.layout_json?.text_zones?.find((z: any) => z.type === 'cta');

    const headlineMaxChars = headlineZone?.max_chars || 40;
    const bodyMaxChars = bodyZone?.max_chars || 125;
    const ctaMaxChars = ctaZone?.max_chars || 20;

    // Build context for copy generation
    const audienceContext = {
      name: audience.name,
      description: audience.description,
      pain_points: audience.pain_points || [],
      desires: audience.desires || []
    };

    const brandVoice = brandIdentity.voice || {};
    const brandPositioning = brandIdentity.positioning || {};

    const prompt = `
You are a professional ad copywriter creating high-converting ad copy.

CRITICAL: You are NOT designing the layout. The layout is already defined by the template.
Your job is to write copy that fits into predefined text zones.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEMPLATE CONSTRAINTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Headline: Maximum ${headlineMaxChars} characters
- Body Copy: Maximum ${bodyMaxChars} characters
- CTA: Maximum ${ctaMaxChars} characters

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUDIENCE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(audienceContext, null, 2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BRAND VOICE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tone: ${brandVoice.tone_adjectives?.join(', ') || 'Professional'}
Archetype: ${brandVoice.archetype || 'Not specified'}
Language Style: ${brandVoice.language_style || 'Not specified'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR TASK:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write ad copy that:
1. **Headline** (max ${headlineMaxChars} chars): 
   - Grabs attention immediately
   - Addresses audience pain point or desire
   - Uses brand voice
   - MUST be exactly ${headlineMaxChars} characters or less

2. **Body Copy** (max ${bodyMaxChars} chars):
   - Explains the value proposition
   - Connects to audience emotions
   - Uses brand voice
   - MUST be exactly ${bodyMaxChars} characters or less

3. **CTA** (max ${ctaMaxChars} chars):
   - Clear action verb
   - Creates urgency or desire
   - MUST be exactly ${ctaMaxChars} characters or less

CRITICAL RULES:
- Respect character limits EXACTLY
- Match brand voice and tone
- Address audience pain points/desires
- Use language that resonates with ${audience.name}
- Do NOT include layout instructions (layout is template-defined)
- Do NOT exceed character limits

Return a JSON object:
{
  "headline": "Your headline here (max ${headlineMaxChars} chars)",
  "body_copy": "Your body copy here (max ${bodyMaxChars} chars)",
  "cta": "Your CTA here (max ${ctaMaxChars} chars)"
}
`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a professional ad copywriter. Always return valid JSON matching the requested structure.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content);

      // Validate character limits
      if (parsed.headline && parsed.headline.length > headlineMaxChars) {
        parsed.headline = parsed.headline.substring(0, headlineMaxChars);
      }
      if (parsed.body_copy && parsed.body_copy.length > bodyMaxChars) {
        parsed.body_copy = parsed.body_copy.substring(0, bodyMaxChars);
      }
      if (parsed.cta && parsed.cta.length > ctaMaxChars) {
        parsed.cta = parsed.cta.substring(0, ctaMaxChars);
      }

      return NextResponse.json({
        headline: parsed.headline || 'Headline',
        body_copy: parsed.body_copy || 'Body copy',
        cta: parsed.cta || 'Learn More'
      });

    } catch (error: any) {
      console.error('Ad copy generation failed:', error);
      // Return fallback copy
      return NextResponse.json({
        headline: 'Transform Your Life',
        body_copy: audience.description || 'Experience the difference',
        cta: 'Get Started'
      });
    }

  } catch (error: any) {
    console.error('Generate ad copy API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate ad copy', details: error.message },
      { status: 500 }
    );
  }
}
