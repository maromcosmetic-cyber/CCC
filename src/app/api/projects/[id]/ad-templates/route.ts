/**
 * Ad Templates API
 * 
 * Handles template CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/auth/server';
import { generateTemplateFromGuideline } from '@/lib/ad-creation/template-generator';

/**
 * GET /api/projects/[id]/ad-templates
 * Returns all templates for project
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const { searchParams } = new URL(req.url);
    const guidelineId = searchParams.get('guideline_id');
    const platform = searchParams.get('platform');
    const type = searchParams.get('type');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    let query = supabase
      .from('ad_templates')
      .select('*')
      .eq('project_id', projectId);

    if (guidelineId) {
      query = query.eq('guideline_id', guidelineId);
    }
    if (platform) {
      query = query.eq('platform', platform);
    }
    if (type) {
      query = query.eq('template_type', type);
    }

    const { data: templates, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch templates',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      templates: templates || [],
      count: templates?.length || 0
    });

  } catch (error: any) {
    console.error('Ad Templates API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/ad-templates
 * Creates new template from guidelines
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const body = await req.json();
    const { guideline_id, name, template_type, platform, layout_json, style_rules_json } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    if (!name || !template_type || !platform) {
      return NextResponse.json({ 
        error: 'name, template_type, and platform are required' 
      }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // If guideline_id is provided, generate template from guideline
    if (guideline_id) {
      // Fetch guideline
      const { data: guideline, error: guidelineError } = await supabase
        .from('ad_visual_guidelines')
        .select('*')
        .eq('id', guideline_id)
        .eq('project_id', projectId)
        .single();

      if (guidelineError || !guideline) {
        return NextResponse.json({ 
          error: 'Guideline not found',
          details: guidelineError?.message 
        }, { status: 404 });
      }

      // Generate template from guideline
      const templateData = await generateTemplateFromGuideline(
        guideline as any,
        { name, type: template_type, platform }
      );

      // Insert template
      const { data: savedTemplate, error: insertError } = await supabase
        .from('ad_templates')
        .insert({
          project_id: projectId,
          guideline_id,
          name: templateData.name,
          template_type: templateData.template_type,
          platform: templateData.platform,
          layout_json: templateData.layout_json,
          style_rules_json: templateData.style_rules_json
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating template:', insertError);
        return NextResponse.json({ 
          error: 'Failed to create template',
          details: insertError.message 
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        template: savedTemplate
      });
    } else {
      // Manual template creation (with provided layout_json)
      if (!layout_json) {
        return NextResponse.json({ 
          error: 'layout_json is required when guideline_id is not provided' 
        }, { status: 400 });
      }

      const { data: savedTemplate, error: insertError } = await supabase
        .from('ad_templates')
        .insert({
          project_id: projectId,
          guideline_id: null,
          name,
          template_type,
          platform,
          layout_json,
          style_rules_json: style_rules_json || {}
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating template:', insertError);
        return NextResponse.json({ 
          error: 'Failed to create template',
          details: insertError.message 
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        template: savedTemplate
      });
    }

  } catch (error: any) {
    console.error('Ad Template Creation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create template',
      details: error.message 
    }, { status: 500 });
  }
}
