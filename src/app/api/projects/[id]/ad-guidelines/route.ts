/**
 * Visual Guidelines API
 * 
 * Handles visual guidelines management: generation, retrieval, updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/auth/server';
import { extractVisualGuidelines, CompetitorAdData } from '@/lib/ad-creation/visual-guidelines-extractor';

/**
 * GET /api/projects/[id]/ad-guidelines
 * Returns current visual guidelines for project
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    let query = supabase
      .from('ad_visual_guidelines')
      .select('*')
      .eq('project_id', projectId);

    if (category) {
      query = query.eq('category', category);
    }

    const { data: guidelines, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching guidelines:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch guidelines',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      guidelines: guidelines || [],
      count: guidelines?.length || 0
    });

  } catch (error: any) {
    console.error('Visual Guidelines API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/ad-guidelines/generate
 * Analyzes competitor ads to extract visual patterns and create guidelines
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const body = await req.json();
    const { category } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Fetch competitors with ad data
    const { data: competitors, error: competitorsError } = await supabase
      .from('competitors')
      .select('id, name, url, analysis_json')
      .eq('project_id', projectId);

    if (competitorsError) {
      return NextResponse.json({ 
        error: 'Failed to fetch competitors',
        details: competitorsError.message 
      }, { status: 500 });
    }

    if (!competitors || competitors.length === 0) {
      return NextResponse.json({ 
        error: 'No competitors found. Please scan competitor ads first.',
      }, { status: 400 });
    }

    // Prepare competitor ad data for extraction
    const competitorAdData: CompetitorAdData[] = [];

    for (const comp of competitors) {
      const analysis = comp.analysis_json || {};
      const adsData = analysis.ads_data || {};

      if (adsData.has_active_ads && adsData.raw_ads) {
        // Calculate longevity for ads
        const adsWithLongevity = adsData.raw_ads.map((ad: any) => {
          let longevityDays = 0;
          if (ad.ad_delivery_start_time) {
            const startDate = new Date(ad.ad_delivery_start_time);
            const now = new Date();
            longevityDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          }
          return {
            ...ad,
            longevity_days: longevityDays
          };
        });

        competitorAdData.push({
          competitor_name: comp.name,
          ads: adsWithLongevity,
          total_ads: adsData.total_ads_found || 0,
          platforms: adsData.ad_platforms || [],
          ad_frequency: adsData.ad_frequency || 'Unknown'
        });
      }
    }

    if (competitorAdData.length === 0) {
      return NextResponse.json({ 
        error: 'No competitor ad data found. Please scan competitor ads first.',
      }, { status: 400 });
    }

    // Extract visual guidelines
    console.log(`📊 Extracting visual guidelines from ${competitorAdData.length} competitors...`);
    const guidelineData = await extractVisualGuidelines(projectId, competitorAdData);

    // Determine category
    const guidelineCategory = category || guidelineData.category || 'general';

    // Check if guideline already exists for this category
    const { data: existing } = await supabase
      .from('ad_visual_guidelines')
      .select('id')
      .eq('project_id', projectId)
      .eq('category', guidelineCategory)
      .single();

    let savedGuideline;

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('ad_visual_guidelines')
        .update({
          guideline_json: guidelineData.guideline_json,
          brand_alignment_json: guidelineData.brand_alignment_json,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      savedGuideline = data;
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('ad_visual_guidelines')
        .insert({
          project_id: projectId,
          category: guidelineCategory,
          guideline_json: guidelineData.guideline_json,
          brand_alignment_json: guidelineData.brand_alignment_json
        })
        .select()
        .single();

      if (error) throw error;
      savedGuideline = data;
    }

    return NextResponse.json({
      success: true,
      guideline: savedGuideline
    });

  } catch (error: any) {
    console.error('Visual Guidelines Generation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate guidelines',
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * PUT /api/projects/[id]/ad-guidelines/[guidelineId]
 * Updates brand alignment rules (manual override)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; guidelineId: string } }
) {
  try {
    const projectId = params.id;
    const guidelineId = params.guidelineId;
    const body = await req.json();
    const { brand_alignment_json } = body;

    if (!projectId || !guidelineId) {
      return NextResponse.json({ error: 'Project ID and Guideline ID are required' }, { status: 400 });
    }

    if (!brand_alignment_json) {
      return NextResponse.json({ error: 'brand_alignment_json is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data: updated, error } = await supabase
      .from('ad_visual_guidelines')
      .update({
        brand_alignment_json,
        updated_at: new Date().toISOString()
      })
      .eq('id', guidelineId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) {
      console.error('Error updating guideline:', error);
      return NextResponse.json({ 
        error: 'Failed to update guideline',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      guideline: updated
    });

  } catch (error: any) {
    console.error('Visual Guidelines Update error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
