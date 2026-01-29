// Create/manage characters API

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { CreateCharacterSchema } from '@/lib/validation/schemas';
import { logAuditEvent } from '@/lib/audit/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const { videoId } = params;
    const body = await request.json();
    const validated = CreateCharacterSchema.parse(body);

    // Get project_id from UGC video
    const { data: video } = await supabase
      .from('ugc_videos')
      .select('project_id')
      .eq('id', videoId)
      .single();

    if (!video) {
      return NextResponse.json({ error: 'UGC video not found' }, { status: 404 });
    }

    // Create character
    const { data: character, error } = await supabase
      .from('characters')
      // @ts-ignore
      .insert({
        project_id: (video as any).project_id,
        name: validated.name,
        description: validated.description,
        character_image_path: validated.character_image_path,
        character_data: validated.character_data || {},
      } as any)
      .select()
      .single();

    if (error || !character) {
      return NextResponse.json({ error: error?.message || 'Failed to create character' }, { status: 500 });
    }

    await logAuditEvent({
      event_type: 'character_created',
      actor_type: 'user',
      source: 'ui',
      project_id: (video as any).project_id,
      payload: { character_id: (character as any).id },
    });

    return NextResponse.json({ character_id: (character as any).id });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


