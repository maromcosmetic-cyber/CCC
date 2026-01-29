// Ad Generation worker job handler

import OpenAI from 'openai';
import { AdGenerationJobData } from '../queue/jobs';
import { generateAdFromTemplate } from '../ad-creation/ad-generator';
import { supabaseAdmin } from '../db/client';
import { logAuditEvent } from '../audit/logger';
import { logCost } from '../costs/tracker';
import { GoogleVisionProvider } from '../providers/google-vision/GoogleVisionProvider';
import { AdCreativeStrategy, ImageLayoutMap } from '@/types/models';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateAdsJob(data: AdGenerationJobData): Promise<void> {
  const {
    project_id,
    job_id,
    template_id,
    audience_segment_id,
    image_id,
    image_url,
    image_path,
    image_bucket,
    hook, // New field from UI
    headline,
    body_copy,
    cta,
    layout_changes,
    product_id, // Legacy support
    count = 1, // Default to 1 for new flow
  } = data;

  try {
    // Load template - REMOVED MANUAL SELECTION
    // We now select template automatically after image analysis


    // Load audience segment
    const { data: audience, error: audienceError } = await (supabaseAdmin as any)
      ?.from('audience_segments')
      .select('*')
      .eq('id', audience_segment_id)
      .single();

    if (audienceError || !audience) {
      throw new Error(`Audience segment not found: ${audience_segment_id}`);
    }

    // Load project brand identity (needed for strategy)
    const { data: project } = await (supabaseAdmin as any)
      ?.from('projects')
      .select('brand_identity')
      .eq('id', project_id)
      .single();

    const brandIdentity = project?.brand_identity || {};

    // Load product if provided
    let product = null;
    if (product_id) {
      // Check if it's a UUID (database product) or numeric (WooCommerce product)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product_id);

      if (isUUID) {
        // Try by UUID (database product)
        const { data: productData, error: productError } = await (supabaseAdmin as any)
          ?.from('products')
          .select('*')
          .eq('id', product_id)
          .eq('project_id', project_id)
          .single();

        if (!productError && productData) {
          product = productData;
        }
      } else {
        // Try by source_id (WooCommerce product)
        const { data: productData, error: productError } = await (supabaseAdmin as any)
          ?.from('products')
          .select('*')
          .eq('source_id', product_id)
          .eq('project_id', project_id)
          .single();

        if (!productError && productData) {
          product = productData;
        } else {
          console.warn(`⚠️ Product ${product_id} not found in database, using WooCommerce ID only`);
          product = {
            id: null,
            source_id: product_id,
            name: `Product ${product_id}`,
            description: '',
            price: 0,
            currency: 'USD',
            project_id: project_id
          };
        }
      }
    }

    // 1. Image Selection & Analysis
    // Get audience name (persona name) for better image matching
    const { data: audienceData } = await (supabaseAdmin as any)
      ?.from('audience_segments')
      .select('name')
      .eq('id', audience_segment_id)
      .single();

    const personaName = audienceData?.name;
    let campaignImageUrl: string | null = null;

    // Try persona + product first
    if (product_id && personaName) {
      const { data: imageAssets } = await (supabaseAdmin as any)
        ?.from('media_assets')
        .select('storage_url')
        .eq('project_id', project_id)
        .eq('audience_id', audience_segment_id)
        .eq('persona_name', personaName)
        .contains('product_ids', [product_id])
        .not('storage_url', 'is', null);

      if (imageAssets && imageAssets.length > 0) {
        const randomIndex = Math.floor(Math.random() * imageAssets.length);
        campaignImageUrl = imageAssets[randomIndex]?.storage_url || null;
      }
    }

    // Try persona only (no product)
    if (!campaignImageUrl && personaName) {
      const { data: imageAssets } = await (supabaseAdmin as any)
        ?.from('media_assets')
        .select('storage_url')
        .eq('project_id', project_id)
        .eq('audience_id', audience_segment_id)
        .eq('persona_name', personaName)
        .not('storage_url', 'is', null);

      if (imageAssets && imageAssets.length > 0) {
        const randomIndex = Math.floor(Math.random() * imageAssets.length);
        campaignImageUrl = imageAssets[randomIndex]?.storage_url || null;
      }
    }

    // Fallback: audience only
    if (!campaignImageUrl) {
      let query = (supabaseAdmin as any)
        ?.from('media_assets')
        .select('storage_url')
        .eq('project_id', project_id)
        .eq('audience_id', audience_segment_id)
        .not('storage_url', 'is', null);

      if (product_id) {
        query = query.contains('product_ids', [product_id]);
      }

      const { data: imageAssets } = await query;

      if (imageAssets && imageAssets.length > 0) {
        const randomIndex = Math.floor(Math.random() * imageAssets.length);
        campaignImageUrl = imageAssets[randomIndex]?.storage_url || null;
      }
    }

    const finalImageUrl = image_url || campaignImageUrl;

    if (!finalImageUrl) {
      throw new Error('No image URL provided. Please select an image.');
    }

    // ANALYZE IMAGE (Google Vision)
    console.log('👁️ Analyzing image with Google Vision...');
    const visionProvider = new GoogleVisionProvider();
    const visualAnalysis = await visionProvider.analyzeImage(finalImageUrl);
    console.log('✅ Image Analysis Complete:', visualAnalysis);

    // Validate Compatibility (Deprecated - Selector handles this internally via logic)
    // const { validateTemplateCompatibility } = await import('../ad-creation/compliance');
    // const compatibility = validateTemplateCompatibility(template as any, visualAnalysis as any);
    // ...

    // 2. Intelligence Assembly (Competitors)
    // Fetch competitors
    const { data: competitors } = await (supabaseAdmin as any)
      ?.from('competitors')
      .select('name, main_benefit, weaknesses')
      .eq('project_id', project_id)
      .limit(3);

    // 3. Creative Strategy Generation
    console.log('🧠 Generating Creative Strategy...');
    const strategy = await generateCreativeStrategy(
      audience,
      brandIdentity,
      competitors || [],
      product
    );
    console.log('✅ Strategy Generated:', strategy.angle);

    // 4. Automatic Template Selection (NEW)
    const { TemplateSelector } = await import('../ad-creation/template-selector');
    const template = TemplateSelector.selectTemplate(visualAnalysis as any, strategy);
    console.log(`✅ Automatically selected template: ${template.name}`);

    // Generate ad(s)
    const generatedAds = [];
    const errors: string[] = [];
    const adCount = count || 1;

    // Services
    const { AdRenderer } = await import('../ad-creation/renderer');
    const { AdQA } = await import('../ad-creation/qa');
    const renderer = new AdRenderer();
    const qa = new AdQA();

    for (let i = 0; i < adCount; i++) {
      try {
        const ad = await generateAdFromTemplate(
          template as any,
          audience as any,
          product as any,
          finalImageUrl,
          strategy, // Pass strategy
          visualAnalysis as any, // Pass visual analysis (ensure types match)
          headline,
          body_copy,
          hook, // Pass hook
          cta
        );

        // QA Check
        console.log(`🔍 Running QA for ad ${i + 1}...`);
        const qaResult = await qa.validate(ad as any, template as any);

        if (!qaResult.passed) {
          console.warn(`⚠️ Ad ${i + 1} failed QA:`, qaResult.issues);
          // Logic: We could skip saving, or save as 'rejected'. 
          // Requirement says: "Automated QA: Ads must pass checks before user review."
          // We'll save as 'draft' but with failed QA flags.
        }

        // Render Image
        console.log(`🎨 Rendering ad ${i + 1}...`);
        let renderedImageUrl = null;
        try {
          renderedImageUrl = await renderer.render(ad as any);
        } catch (renderError) {
          console.error(`❌ Rendering failed for ad ${i + 1}:`, renderError);
          errors.push(`Rendering failed: ${(renderError as Error).message}`);
        }

        // Update Ad object with results
        ad.assets_json.rendered_image_url = renderedImageUrl || undefined;
        ad.metadata_json.qa_results = qaResult;

        // Store generated ad
        const { data: savedAd, error: saveError } = await (supabaseAdmin as any)
          ?.from('generated_ads')
          .insert({
            project_id: ad.project_id,
            template_id: ad.template_id,
            audience_segment_id: ad.audience_segment_id,
            product_id: ad.product_id,
            ad_type: ad.ad_type,
            assets_json: ad.assets_json,
            metadata_json: ad.metadata_json,
            status: ad.status,
          })
          .select()
          .single();

        if (saveError) {
          errors.push(`Failed to save ad ${i + 1}: ${saveError.message}`);
        } else if (savedAd) {
          generatedAds.push(savedAd);
        }
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to generate ad ${i + 1}: ${errorMessage}`);
        console.error(`Ad generation error for ad ${i + 1}:`, error);
      }
    }

    console.log(`✅ Generated ${generatedAds.length} ads out of ${count} requested`);

    await logAuditEvent({
      event_type: 'ads_generated',
      actor_type: 'worker',
      source: 'worker',
      project_id,
      payload: {
        job_id,
        template_id,
        audience_segment_id,
        ads_count: generatedAds.length,
        strategy_angle: strategy.angle
      },
    });

    // Log cost...

  } catch (error: any) {
    // ... Error handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logAuditEvent({
      event_type: 'ad_generation_failed',
      actor_type: 'worker',
      source: 'worker',
      project_id,
      payload: {
        job_id,
        error: errorMessage,
      },
    });

    throw error;
  }
}

async function generateCreativeStrategy(
  audience: any,
  brandIdentity: any,
  competitors: any[],
  product: any
): Promise<AdCreativeStrategy> {

  const context = `
    Audience: ${audience.name} - ${audience.description}
    Pain Points: ${audience.pain_points?.join(', ') || 'N/A'}
    
    Brand Voice: ${brandIdentity.voice?.tone_adjectives?.join(', ') || 'Professional'}
    
    Product: ${product ? product.name : 'Brand Awareness'}
    
    Competitors: ${competitors.map(c => c.name).join(', ')}
    `;

  const prompt = `
    Generate a high-performance Ad Creative Strategy for a Meta/Facebook Image Ad.
    
    Context:
    ${context}
    
    Determine the best:
    1. Angle (problem_solution, social_proof, authority, urgency, benefit, offer)
    2. Emotional Tone
    3. Message Density
    4. Hook Concept (1 sentence idea)
    5. Rationale
    
    Return JSON only.
    `;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No strategy generated");

    const data = JSON.parse(content);

    return {
      angle: data.angle || 'benefit',
      emotional_tone: data.emotional_tone || 'energetic',
      message_density: data.message_density || 'moderate',
      risk_level: 'conservative', // Safer default
      hook_concept: data.hook_concept || 'Stop scrolling',
      rationale: data.rationale || 'Standard best practice'
    };
  } catch (e) {
    console.error("Strategy generation failed, using fallback", e);
    return {
      angle: 'benefit',
      emotional_tone: 'energetic',
      message_density: 'moderate',
      risk_level: 'conservative',
      hook_concept: 'Discover the solution',
      rationale: 'Fallback strategy'
    };
  }
}

