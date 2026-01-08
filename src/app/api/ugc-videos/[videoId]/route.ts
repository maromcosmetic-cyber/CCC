// Get UGC video status API

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const { videoId } = params;

    const { data: video, error } = await supabase
      .from('ugc_videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (error || !video) {
      return NextResponse.json({ error: 'UGC video not found' }, { status: 404 });
    }

    // Get generation job progress
    const { data: jobs } = await supabase
      .from('video_generation_jobs')
      .select('*')
      .eq('ugc_video_id', videoId)
      .order('created_at', { ascending: true });

    const currentStep = jobs?.find((j) => j.status === 'running');
    const progress = currentStep
      ? {
          step: currentStep.step,
          status: currentStep.status,
        }
      : undefined;

    return NextResponse.json({
      video: {
        id: video.id,
        status: video.status,
        storage_url: video.storage_url,
        progress,
        video_duration_seconds: video.video_duration_seconds,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


