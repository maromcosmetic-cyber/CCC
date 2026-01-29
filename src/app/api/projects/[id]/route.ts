// Project detail API routes

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/auth/server';
import { logAuditEvent } from '@/lib/audit/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const supabase = createServiceRoleClient();

    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error || !project) {
      console.error('❌ Project not found:', error);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error: any) {
    console.error('❌ GET error:', error);
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

    console.log('📝 Updating project:', projectId);
    console.log('📦 Data keys:', Object.keys(body));

    const supabase = createServiceRoleClient();

    const { data: project, error } = await supabase
      .from('projects')
      .update(body)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({
        error: error.message,
        details: error
      }, { status: 500 });
    }

    if (!project) {
      console.error('❌ No project returned after update');
      return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }

    console.log('✅ Project updated successfully');

    await logAuditEvent({
      event_type: 'project_updated',
      actor_type: 'system' as any,
      source: 'brand_analyzer' as any,
      project_id: projectId,
      payload: { updated_fields: Object.keys(body) },
    });

    return NextResponse.json({ project });
  } catch (error: any) {
    console.error('❌ API error:', error);
    return NextResponse.json({
      error: error.message || 'Internal server error',
      stack: error.stack
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      console.error('❌ Delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditEvent({
      event_type: 'project_deleted',
      actor_type: 'system' as any,
      source: 'api' as any,
      project_id: projectId,
      payload: {},
    });

    console.log('✅ Project deleted successfully');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


