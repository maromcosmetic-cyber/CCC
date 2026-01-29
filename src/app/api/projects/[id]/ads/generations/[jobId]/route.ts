/**
 * Ad Generation Job Status API
 * 
 * Polls generation job status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/auth/server';

/**
 * GET /api/projects/[id]/ads/generations/[jobId]
 * Returns generation job status and completed ads
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; jobId: string } }
) {
  try {
    const projectId = params.id;
    const jobId = params.jobId;

    if (!projectId || !jobId) {
      return NextResponse.json({ error: 'Project ID and Job ID are required' }, { status: 400 });
    }

    // For now, we'll query generated_ads that were created around the job time
    // In a full implementation, you'd have a job tracking table
    const supabase = createServiceRoleClient();

    // Get ads created in the last hour (approximate job window)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: ads, error } = await supabase
      .from('generated_ads')
      .select('*')
      .eq('project_id', projectId)
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching generation status:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch generation status',
        details: error.message 
      }, { status: 500 });
    }

    // Estimate status based on ad count
    // In production, you'd track this in a jobs table
    const status = ads && ads.length > 0 ? 'completed' : 'processing';

    return NextResponse.json({
      job_id: jobId,
      status,
      ads: ads || [],
      count: ads?.length || 0
    });

  } catch (error: any) {
    console.error('Ad Generation Status API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
