// Project detail API routes

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { logAuditEvent } from '@/lib/audit/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const body = await request.json();

    const { data: project, error } = await supabase
      .from('projects')
      .update(body)
      .eq('id', projectId)
      .select()
      .single();

    if (error || !project) {
      return NextResponse.json({ error: error?.message || 'Failed to update project' }, { status: 500 });
    }

    await logAuditEvent({
      event_type: 'project_updated',
      actor_type: 'user',
      source: 'ui',
      project_id: projectId,
      payload: body,
    });

    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditEvent({
      event_type: 'project_deleted',
      actor_type: 'user',
      source: 'ui',
      project_id: projectId,
      payload: {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


