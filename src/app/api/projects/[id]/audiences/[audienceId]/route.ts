// Audience detail API routes

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { UpdateAudienceSchema } from '@/lib/validation/schemas';
import { logAuditEvent } from '@/lib/audit/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; audienceId: string } }
) {
  try {
    const { audienceId } = params;

    const { data: audience, error } = await supabase
      .from('audience_segments')
      .select('*')
      .eq('id', audienceId)
      .single();

    if (error || !audience) {
      return NextResponse.json({ error: 'Audience not found' }, { status: 404 });
    }

    return NextResponse.json({
      audience: {
        id: audience.id,
        name: audience.name,
        targeting: audience.targeting,
        platform_specific_configs: audience.platform_specific_configs,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; audienceId: string } }
) {
  try {
    const { id: projectId, audienceId } = params;
    const body = await request.json();
    const validated = UpdateAudienceSchema.parse(body);

    const { data: audience, error } = await supabase
      .from('audience_segments')
      .update(validated)
      .eq('id', audienceId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error || !audience) {
      return NextResponse.json({ error: error?.message || 'Failed to update audience' }, { status: 500 });
    }

    await logAuditEvent({
      event_type: 'audience_updated',
      actor_type: 'user',
      source: 'ui',
      project_id: projectId,
      payload: { audience_id: audienceId },
    });

    return NextResponse.json({ audience });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


