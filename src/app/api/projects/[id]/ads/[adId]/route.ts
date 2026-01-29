/**
 * Single Generated Ad API
 * 
 * Handles individual ad operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/auth/server';

/**
 * GET /api/projects/[id]/ads/[adId]
 * Returns single ad with all assets
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; adId: string } }
) {
  try {
    const projectId = params.id;
    const adId = params.adId;

    if (!projectId || !adId) {
      return NextResponse.json({ error: 'Project ID and Ad ID are required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data: ad, error } = await supabase
      .from('generated_ads')
      .select('*')
      .eq('id', adId)
      .eq('project_id', projectId)
      .single();

    if (error) {
      console.error('Error fetching ad:', error);
      return NextResponse.json({ 
        error: 'Ad not found',
        details: error.message 
      }, { status: 404 });
    }

    return NextResponse.json({
      ad
    });

  } catch (error: any) {
    console.error('Generated Ad API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * PUT /api/projects/[id]/ads/[adId]
 * Updates ad status (draft → approved → archived)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; adId: string } }
) {
  try {
    const projectId = params.id;
    const adId = params.adId;
    const body = await req.json();
    const { status, assets_json, metadata_json } = body;

    if (!projectId || !adId) {
      return NextResponse.json({ error: 'Project ID and Ad ID are required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (status !== undefined) {
      if (!['draft', 'approved', 'archived'].includes(status)) {
        return NextResponse.json({ 
          error: 'Invalid status. Must be draft, approved, or archived' 
        }, { status: 400 });
      }
      updateData.status = status;
    }
    if (assets_json !== undefined) updateData.assets_json = assets_json;
    if (metadata_json !== undefined) updateData.metadata_json = metadata_json;

    const { data: updated, error } = await supabase
      .from('generated_ads')
      .update(updateData)
      .eq('id', adId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) {
      console.error('Error updating ad:', error);
      return NextResponse.json({ 
        error: 'Failed to update ad',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      ad: updated
    });

  } catch (error: any) {
    console.error('Generated Ad Update error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
