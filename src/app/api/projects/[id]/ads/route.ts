/**
 * Generated Ads API
 * 
 * Handles ad generation and management
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/auth/server';
import { getQueueClient } from '@/lib/queue/client';
import { JOB_TYPES } from '@/lib/queue/jobs';
import { randomUUID } from 'crypto';

/**
 * GET /api/projects/[id]/ads
 * Returns all generated ads
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get('template_id');
    const audienceSegmentId = searchParams.get('audience_segment_id');
    const productId = searchParams.get('product_id');
    const status = searchParams.get('status');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    let query = supabase
      .from('generated_ads')
      .select('*')
      .eq('project_id', projectId);

    if (templateId) {
      query = query.eq('template_id', templateId);
    }
    if (audienceSegmentId) {
      query = query.eq('audience_segment_id', audienceSegmentId);
    }
    if (productId) {
      query = query.eq('product_id', productId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: ads, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching ads:', error);
      return NextResponse.json({
        error: 'Failed to fetch ads',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      ads: ads || [],
      count: ads?.length || 0
    });

  } catch (error: any) {
    console.error('Generated Ads API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/ads/generate
 * Generates ads from template + audience + product
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const body = await req.json();
    const {
      audience_segment_id,
      image_id,
      headline,
      body_copy,
      cta,
      layout_changes,
      product_id, // Legacy support
      count = 1 // Default to 1 since we're now generating single ads with preview
    } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    if (!audience_segment_id) {
      return NextResponse.json({
        error: 'audience_segment_id is required'
      }, { status: 400 });
    }

    if (!image_id) {
      return NextResponse.json({
        error: 'image_id is required. Please select an image for the ad.'
      }, { status: 400 });
    }

    // Validate image exists
    const { data: image, error: imageError } = await supabase
      .from('media_assets')
      .select('id, storage_url, storage_path, storage_bucket')
      .eq('id', image_id)
      .eq('project_id', projectId)
      .single();

    if (imageError || !image) {
      return NextResponse.json({
        error: 'Image not found'
      }, { status: 404 });
    }

    // Validate template exists - REMOVED (Automatic Selection)
    /*
    const { data: template, error: templateError } = await supabase
      .from('ad_templates')
      .select('id')
      .eq('id', template_id)
      .eq('project_id', projectId)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ 
        error: 'Template not found' 
      }, { status: 404 });
    }
    */

    // Validate audience exists
    const { data: audience, error: audienceError } = await supabase
      .from('audience_segments')
      .select('id')
      .eq('id', audience_segment_id)
      .eq('project_id', projectId)
      .single();

    if (audienceError || !audience) {
      return NextResponse.json({
        error: 'Audience segment not found'
      }, { status: 404 });
    }

    // Validate product if provided
    // Product can be optional, but if provided, it should exist
    if (product_id && product_id !== 'none' && product_id !== '') {
      // Check if it's a UUID (database product) or numeric (WooCommerce ID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product_id);

      let product = null;
      let productError = null;

      if (isUUID) {
        // Try by UUID (database product)
        const { data, error } = await supabase
          .from('products')
          .select('id')
          .eq('id', product_id)
          .eq('project_id', projectId)
          .single();
        product = data;
        productError = error;
      } else {
        // Try by source_id (WooCommerce product)
        const { data, error } = await supabase
          .from('products')
          .select('id')
          .eq('source_id', product_id)
          .eq('project_id', projectId)
          .single();
        product = data;
        productError = error;
      }

      // If product not found, it's not a critical error - we can still generate ads without product
      // But log it for debugging
      if (productError || !product) {
        console.warn(`⚠️ Product not found (${product_id}), but continuing without product-specific targeting`);
        // Don't return error - product is optional for ad generation
        // The worker will handle null product gracefully
      }
    }

    // Create job ID
    const jobId = randomUUID();

    // Queue ad generation job
    const queue = await getQueueClient();
    await queue.send({
      name: JOB_TYPES.GENERATE_ADS,
      data: {
        project_id: projectId,
        job_id: jobId,
        // template_id, // Removed
        audience_segment_id,
        image_id: image_id,
        image_url: image.storage_url,
        image_path: image.storage_path,
        image_bucket: image.storage_bucket,
        headline: headline || null,
        body_copy: body_copy || null,
        cta: cta || null,
        layout_changes: layout_changes || null,
        product_id: product_id || null, // Legacy support
        count: 1 // Always generate 1 ad when using preview flow
      }
    });

    return NextResponse.json({
      success: true,
      job_id: jobId,
      message: 'Ad generation started'
    });

  } catch (error: any) {
    console.error('Ad Generation API error:', error);
    return NextResponse.json({
      error: 'Failed to start ad generation',
      details: error.message
    }, { status: 500 });
  }
}
