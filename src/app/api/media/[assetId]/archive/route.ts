import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/client';
import { createServiceRoleClient } from '@/lib/auth/server';

/**
 * PATCH /api/media/[assetId]/archive
 * 
 * Archive or unarchive a media asset
 * Body: { archived: boolean }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { assetId: string } }
) {
  try {
    const assetId = params.assetId;
    const body = await request.json();
    const { archived } = body;

    if (typeof archived !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing or invalid archived parameter' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createServiceRoleClient();

    // Update the media asset
    // Note: We'll use approved=false for archived, approved=true for kept
    // Or we can add an archived column if needed
    const { data, error } = await supabaseAdmin
      .from('media_assets')
      .update({ approved: !archived }) // If archived=true, set approved=false; if archived=false, set approved=true
      .eq('id', assetId)
      .select()
      .single();

    if (error) {
      console.error('Failed to archive media asset:', error);
      return NextResponse.json(
        { error: 'Failed to archive media asset', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      asset: data,
      message: archived ? 'Image archived' : 'Image restored',
    });
  } catch (error: any) {
    console.error('Archive API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}