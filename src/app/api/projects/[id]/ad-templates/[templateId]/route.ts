/**
 * Single Ad Template API
 * 
 * Handles individual template operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/auth/server';

/**
 * GET /api/projects/[id]/ad-templates/[templateId]
 * Returns single template with full layout details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; templateId: string } }
) {
  try {
    const projectId = params.id;
    const templateId = params.templateId;

    if (!projectId || !templateId) {
      return NextResponse.json({ error: 'Project ID and Template ID are required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data: template, error } = await supabase
      .from('ad_templates')
      .select('*')
      .eq('id', templateId)
      .eq('project_id', projectId)
      .single();

    if (error) {
      console.error('Error fetching template:', error);
      return NextResponse.json({ 
        error: 'Template not found',
        details: error.message 
      }, { status: 404 });
    }

    return NextResponse.json({
      template
    });

  } catch (error: any) {
    console.error('Ad Template API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * PUT /api/projects/[id]/ad-templates/[templateId]
 * Updates template layout (manual edits)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; templateId: string } }
) {
  try {
    const projectId = params.id;
    const templateId = params.templateId;
    const body = await req.json();
    const { name, layout_json, style_rules_json } = body;

    if (!projectId || !templateId) {
      return NextResponse.json({ error: 'Project ID and Template ID are required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name;
    if (layout_json !== undefined) updateData.layout_json = layout_json;
    if (style_rules_json !== undefined) updateData.style_rules_json = style_rules_json;

    const { data: updated, error } = await supabase
      .from('ad_templates')
      .update(updateData)
      .eq('id', templateId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return NextResponse.json({ 
        error: 'Failed to update template',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      template: updated
    });

  } catch (error: any) {
    console.error('Ad Template Update error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/ad-templates/[templateId]
 * Deletes template
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; templateId: string } }
) {
  try {
    const projectId = params.id;
    const templateId = params.templateId;

    if (!projectId || !templateId) {
      return NextResponse.json({ error: 'Project ID and Template ID are required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from('ad_templates')
      .delete()
      .eq('id', templateId)
      .eq('project_id', projectId);

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json({ 
        error: 'Failed to delete template',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error: any) {
    console.error('Ad Template Delete error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
