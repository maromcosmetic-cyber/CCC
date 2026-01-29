/**
 * Ad Intelligence API
 * 
 * Handles competitor ad scanning and intelligence gathering
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/auth/server';
import { fetchCompetitorAds } from '@/lib/competitor/meta-ads-scraper';

/**
 * GET /api/projects/[id]/ad-intelligence/competitors
 * Returns all competitors with ad intelligence data
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Fetch competitors with their analysis data
    const { data: competitors, error } = await supabase
      .from('competitors')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching competitors:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch competitors',
        details: error.message 
      }, { status: 500 });
    }

    // Extract ad intelligence from competitor analysis
    const competitorsWithAds = (competitors || []).map(comp => {
      const analysis = comp.analysis_json || {};
      const adsData = analysis.ads_data || {};

      // Calculate longevity for ads
      const rawAds = adsData.raw_ads || [];
      const adsWithLongevity = rawAds.map((ad: any) => {
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

      return {
        id: comp.id,
        name: comp.name,
        url: comp.url,
        total_ads: adsData.total_ads_found || 0,
        platforms: adsData.ad_platforms || [],
        ad_frequency: adsData.ad_frequency || 'Unknown',
        ads: adsWithLongevity.slice(0, 20), // Limit to 20 for response size
        has_active_ads: adsData.has_active_ads || false,
        last_analyzed_at: comp.last_analyzed_at
      };
    });

    return NextResponse.json({
      competitors: competitorsWithAds,
      count: competitorsWithAds.length
    });

  } catch (error: any) {
    console.error('Ad Intelligence API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/ad-intelligence/scan
 * Triggers competitor ad scan for all tracked competitors
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Fetch all competitors for this project
    const { data: competitors, error: competitorsError } = await supabase
      .from('competitors')
      .select('id, name, url')
      .eq('project_id', projectId);

    if (competitorsError) {
      return NextResponse.json({ 
        error: 'Failed to fetch competitors',
        details: competitorsError.message 
      }, { status: 500 });
    }

    if (!competitors || competitors.length === 0) {
      return NextResponse.json({ 
        error: 'No competitors found. Please add competitors first.',
      }, { status: 400 });
    }

    // Scan ads for each competitor
    const scanResults = [];
    const errors: string[] = [];

    for (const competitor of competitors) {
      try {
        console.log(`📢 Scanning ads for ${competitor.name}...`);
        const adsData = await fetchCompetitorAds(competitor.url, projectId);

        if (adsData) {
          // Update competitor record with ad data
          const analysis = await supabase
            .from('competitors')
            .select('analysis_json')
            .eq('id', competitor.id)
            .single();

          const currentAnalysis = analysis.data?.analysis_json || {};
          currentAnalysis.ads_data = adsData;

          await supabase
            .from('competitors')
            .update({
              analysis_json: currentAnalysis,
              active_ads_count: adsData.total_ads_found || 0,
              last_analyzed_at: new Date().toISOString()
            })
            .eq('id', competitor.id);

          scanResults.push({
            competitor_id: competitor.id,
            competitor_name: competitor.name,
            total_ads: adsData.total_ads_found || 0,
            platforms: adsData.ad_platforms || [],
            success: true
          });
        } else {
          errors.push(`No ad data found for ${competitor.name}`);
        }
      } catch (error: any) {
        console.error(`Error scanning ads for ${competitor.name}:`, error);
        errors.push(`${competitor.name}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      scanned: scanResults.length,
      results: scanResults,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Ad Intelligence Scan API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
