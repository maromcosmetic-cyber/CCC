// Audiences API routes

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { CreateAudienceSchema, UpdateAudienceSchema } from '@/lib/validation/schemas';
import { logAuditEvent } from '@/lib/audit/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    const { data: audiences, error } = await supabase
      .from('audience_segments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ audiences: audiences || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const body = await request.json();
    const validated = CreateAudienceSchema.parse(body);

    // Get next version number
    const { data: existing } = await supabase
      .from('audience_segments')
      .select('version')
      .eq('project_id', projectId)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = existing && existing.length > 0 ? existing[0].version + 1 : 1;

    const { data: audience, error } = await supabase
      .from('audience_segments')
      .insert({
        project_id: projectId,
        version: nextVersion,
        name: validated.name,
        description: validated.description,
        targeting: validated.targeting,
        platform_specific_configs: validated.platform_specific_configs || {},
        ai_suggested: false,
      })
      .select()
      .single();

    if (error || !audience) {
      return NextResponse.json({ error: error?.message || 'Failed to create audience' }, { status: 500 });
    }

    await logAuditEvent({
      event_type: 'audience_created',
      actor_type: 'user',
      source: 'ui',
      project_id: projectId,
      payload: { audience_id: audience.id },
    });

    return NextResponse.json({ audience_segment_id: audience.id });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


