// Generate individual image API

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { GenerateIndividualImageRequest } from '@/types/api';
import { logAuditEvent } from '@/lib/audit/logger';
import { requireAuth } from '@/lib/auth/middleware';
import { createServiceRoleClient } from '@/lib/auth/server';
import { generateAudienceImages } from '@/lib/product-image/pipeline';
import { ImageType } from '@/types/models';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; audienceId: string } }
) {
  try {
    // Auth check
    const auth = await requireAuth(request);
    if (auth.response) return auth.response;

    const projectId = params.id;
    const audienceId = params.audienceId;
    const body = await request.json() as GenerateIndividualImageRequest;

    // Validate audience belongs to project
    const supabaseService = createServiceRoleClient();
    const { data: audience, error: audienceError } = await supabaseService
      .from('audience_segments')
      .select('*')
      .eq('id', audienceId)
      .eq('project_id', projectId)
      .single();

    if (audienceError || !audience) {
      return NextResponse.json({ error: 'Audience not found' }, { status: 404 });
    }

    // Validate required fields
    if (!body.product_id) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 });
    }
    if (!body.image_type) {
      return NextResponse.json({ error: 'image_type is required' }, { status: 400 });
    }

    // Check if product_id is a WooCommerce ID (numeric string) or UUID
    const isWooCommerceId = /^\d+$/.test(String(body.product_id));

    // If it's a WooCommerce ID, we need to sync it to the database first or fetch it
    let productIdToUse = body.product_id;

    if (isWooCommerceId) {
      console.log('📦 Product ID is WooCommerce ID, checking if synced to database...');

      // Check if product exists in database by source_id
      const { data: existingProduct } = await supabaseService
        .from('products')
        .select('id')
        .eq('source_id', body.product_id)
        .eq('project_id', projectId)
        .single();

      if (existingProduct) {
        // Use the database UUID
        productIdToUse = existingProduct.id;
        console.log('✅ Found synced product:', productIdToUse);
      } else {
        // Try to fetch from WooCommerce and create a temporary product record
        console.log('⚠️ Product not in database, fetching from WooCommerce...');
        try {
          const { getWooCommerceClient } = await import('@/lib/woocommerce');
          const woo = await getWooCommerceClient(projectId);
          const { data: wooProduct } = await woo.get(`products/${body.product_id}`);

          if (wooProduct) {
            // Create a temporary product record
            const { data: newProduct, error: createError } = await supabaseService
              .from('products')
              .insert({
                project_id: projectId,
                source_id: String(wooProduct.id),
                name: wooProduct.name,
                description: wooProduct.description || wooProduct.short_description,
                price: parseFloat(wooProduct.price || 0),
                currency: 'USD',
                stock_status: wooProduct.stock_status === 'instock' ? 'in_stock' : 'out_of_stock',
                images: (wooProduct.images || []).map((img: any) => ({
                  url: img.src || img.url,
                  alt: img.alt || wooProduct.name
                })),
                metadata: {
                  sku: wooProduct.sku,
                  categories: wooProduct.categories || []
                }
              })
              .select()
              .single();

            if (newProduct && !createError) {
              productIdToUse = newProduct.id;
              console.log('✅ Created product record:', productIdToUse);
            } else {
              console.error('❌ Failed to create product record:', createError);
              return NextResponse.json({
                error: 'Failed to sync product to database',
                details: createError?.message,
                note: 'Please sync products first or use a product that exists in the database'
              }, { status: 500 });
            }
          } else {
            return NextResponse.json({
              error: 'Product not found in WooCommerce',
              details: `Product ID ${body.product_id} not found`
            }, { status: 404 });
          }
        } catch (wooError: any) {
          console.error('❌ WooCommerce fetch error:', wooError);
          return NextResponse.json({
            error: 'Failed to fetch product from WooCommerce',
            details: wooError.message,
            note: 'Please ensure WooCommerce is connected and the product exists'
          }, { status: 500 });
        }
      }
    }

    // Check API keys
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_TTS_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'Google API key not configured',
        details: 'Set GEMINI_API_KEY or GOOGLE_API_KEY in environment variables',
      }, { status: 500 });
    }

    // Generate single image with progress callback for logging
    console.log('🎨 Starting single image generation:', {
      projectId,
      audienceId,
      product_id: body.product_id,
      image_type: body.image_type,
    });

    const progressCallback = async (step: string, progress: { current: number; total: number; details?: string }) => {
      console.log(`📊 Progress: ${step} (${progress.current}/${progress.total}) - ${progress.details || ''}`);
    };

    let result;
    try {
      result = await generateAudienceImages(
        projectId,
        audienceId,
        {
          product_ids: [productIdToUse], // Use the resolved product ID (UUID)
          campaign_id: body.campaign_id,
          image_types: [body.image_type],
          variations_per_type: 1,
          platform: body.platform,
          funnel_stage: body.funnel_stage,
          angle: body.angle,
        },
        progressCallback
      );
    } catch (pipelineError: any) {
      console.error('❌ Pipeline error:', pipelineError);

      // Check for Vision API error and provide helpful message
      let errorMessage = pipelineError.message || 'Image generation pipeline failed';
      let helpfulNote = '';

      if (errorMessage.includes('Cloud Vision API is not enabled') || errorMessage.includes('SERVICE_DISABLED')) {
        const urlMatch = errorMessage.match(/https:\/\/[^\s]+/);
        const activationUrl = urlMatch ? urlMatch[0] : 'https://console.cloud.google.com/apis/library/vision.googleapis.com';

        helpfulNote = `To fix this:\n1. Visit: ${activationUrl}\n2. Click "Enable"\n3. Wait 2-3 minutes for activation\n4. Try again`;

        return NextResponse.json({
          error: 'Cloud Vision API Not Enabled',
          message: 'The Google Cloud Vision API needs to be enabled to isolate products from backgrounds.',
          activationUrl: activationUrl,
          instructions: helpfulNote,
          details: errorMessage,
        }, { status: 500 });
      }

      // Check for Generative Language API (Gemini) error
      if (errorMessage.includes('Generative Language API is not enabled') || errorMessage.includes('generativelanguage')) {
        const urlMatch = errorMessage.match(/https:\/\/[^\s]+/);
        const activationUrl = urlMatch ? urlMatch[0] : 'https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com';

        helpfulNote = `To fix this:\n1. Visit: ${activationUrl}\n2. Click "Enable"\n3. Wait 2-3 minutes for activation\n4. Try again`;

        return NextResponse.json({
          error: 'Generative Language API Not Enabled',
          message: 'The Google Generative Language API (Gemini) needs to be enabled for image generation.',
          activationUrl: activationUrl,
          instructions: helpfulNote,
          details: errorMessage,
        }, { status: 500 });
      }

      return NextResponse.json({
        error: 'Image generation pipeline failed',
        message: errorMessage,
        details: pipelineError.message,
        stack: process.env.NODE_ENV === 'development' ? pipelineError.stack : undefined,
      }, { status: 500 });
    }

    console.log('✅ Image generation result:', {
      images_count: result.generated_images.length,
      errors_count: result.errors.length,
      warnings_count: result.warnings.length,
      errors: result.errors,
    });

    if (result.generated_images.length === 0) {
      const errorMessage = result.errors.length > 0
        ? result.errors.join('; ')
        : 'Failed to generate image - no images were created';

      console.error('❌ Image generation failed:', errorMessage);
      return NextResponse.json(
        {
          error: errorMessage,
          details: result.errors,
          warnings: result.warnings,
        },
        { status: 500 }
      );
    }

    const generatedImage = result.generated_images[0];

    // Log audit event
    await logAuditEvent({
      event_type: 'individual_image_generated',
      actor_type: 'user',
      source: 'ui',
      project_id: projectId,
      payload: {
        audience_id: audienceId,
        product_id: body.product_id,
        image_type: body.image_type,
        image_id: generatedImage.id,
      },
    });

    return NextResponse.json({
      image_id: generatedImage.id,
      storage_url: generatedImage.storage_url,
      storage_path: generatedImage.storage_path,
      storage_bucket: generatedImage.storage_bucket,
      status: 'completed',
    });
  } catch (error: any) {
    console.error('❌ Generate individual image error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: error.stack,
        note: 'Check server logs for more details'
      },
      { status: 500 }
    );
  }
}
