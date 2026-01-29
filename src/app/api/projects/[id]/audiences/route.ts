// Audiences API routes

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/auth/server';
import { CreateAudienceSchema, UpdateAudienceSchema } from '@/lib/validation/schemas';
import { logAuditEvent } from '@/lib/audit/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    // Use service role client to bypass RLS (same as sync endpoint)
    // This ensures consistency - segments created by sync can be read back
    const supabaseAdmin = createServiceRoleClient();

    const { data: audiences, error } = await supabaseAdmin
      .from('audience_segments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching audience segments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ audiences: audiences || [] });
  } catch (error: any) {
    console.error('Error in GET /api/projects/[id]/audiences:', error);
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
    
    // Check if this is a sync request
    if (body.sync === true) {
      try {
        // Use service role client for sync operations
        const supabaseAdmin = createServiceRoleClient();
        
        // Sync audiences from brand_identity to audience_segments
        // Use .single() since project ID is unique
        const { data: project, error: projectError } = await supabaseAdmin
          .from('projects')
          .select('brand_identity')
          .eq('id', projectId)
          .single();

        if (projectError) {
          console.error('Failed to fetch project:', projectError);
          // Check if it's a "not found" error
          if (projectError.code === 'PGRST116' || projectError.message?.includes('No rows')) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
          }
          return NextResponse.json({ 
            error: 'Failed to fetch project: ' + projectError.message,
            details: projectError 
          }, { status: 500 });
        }

        if (!project) {
          return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (!project || !(project as any).brand_identity?.audiences) {
          return NextResponse.json({ error: 'No audiences found in brand_identity' }, { status: 404 });
        }

        const audiences = (project as any).brand_identity.audiences || [];
        console.log(`Syncing ${audiences.length} audiences for project ${projectId}`);
        
        if (!Array.isArray(audiences) || audiences.length === 0) {
          return NextResponse.json({ error: 'No audiences to sync' }, { status: 400 });
        }
        
        // Get next version number
        const { data: existing } = await supabaseAdmin
          .from('audience_segments')
          .select('version')
          .eq('project_id', projectId)
          .order('version', { ascending: false })
          .limit(1);

        const nextVersion = existing && existing.length > 0 ? (existing[0] as any).version + 1 : 1;
        
        let syncedCount = 0;
        let errorCount = 0;
        
        for (const audience of audiences) {
          try {
            if (!audience.name) {
              console.warn('Skipping audience without name:', audience);
              errorCount++;
              continue;
            }
            
            // Check if audience segment already exists
            const { data: existingSegments, error: checkError } = await supabaseAdmin
              .from('audience_segments')
              .select('id')
              .eq('project_id', projectId)
              .eq('name', audience.name);
            
            if (checkError) {
              console.error(`Error checking for existing segment ${audience.name}:`, checkError);
              errorCount++;
              continue;
            }
            
            const existingSegment = existingSegments && existingSegments.length > 0 ? existingSegments[0] : null;

            const segmentData = {
              project_id: projectId,
              version: nextVersion,
              name: audience.name,
              description: audience.description || '',
              targeting: {
                category: audience.category,
                pain_points: audience.pain_points || [],
                desires: audience.desires || [],
                meta_interests: audience.meta_interests || [],
                age_range: audience.age_range,
                awareness_level: audience.awareness_level,
                hook_concept: audience.hook_concept,
                identity_upgrade: audience.identity_upgrade,
              },
              platform_specific_configs: {},
              ai_suggested: true,
            };

            if (existingSegment) {
              // Update existing segment - use .select() to verify update
              const { data: updatedSegment, error: updateError } = await supabaseAdmin
                .from('audience_segments')
                .update(segmentData)
                .eq('id', existingSegment.id)
                .select()
                .single();
              
              if (updateError || !updatedSegment) {
                console.error(`Failed to update segment ${audience.name}:`, updateError);
                errorCount++;
              } else {
                syncedCount++;
                console.log(`Updated segment: ${audience.name}`);
              }
            } else {
              // Insert new segment - use .select() to verify insertion
              const { data: insertedSegment, error: insertError } = await supabaseAdmin
                .from('audience_segments')
                .insert(segmentData as any)
                .select()
                .single();
              
              if (insertError || !insertedSegment) {
                console.error(`Failed to insert segment ${audience.name}:`, insertError);
                errorCount++;
              } else {
                syncedCount++;
                console.log(`Created segment: ${audience.name} with ID: ${insertedSegment.id}`);
              }
            }
          } catch (err: any) {
            console.error(`Error processing audience ${audience.name}:`, err);
            errorCount++;
          }
        }

        console.log(`Sync complete: ${syncedCount} synced, ${errorCount} errors out of ${audiences.length} total`);

        // If all failed, return error
        if (syncedCount === 0) {
          return NextResponse.json({ 
            success: false,
            error: `Failed to sync any audiences. ${errorCount > 0 ? `${errorCount} errors occurred.` : 'No segments were created.'} Check server logs for details.`,
            synced: syncedCount,
            errors: errorCount,
            total: audiences.length
          }, { status: 500 });
        }

        return NextResponse.json({ 
          success: true, 
          synced: syncedCount,
          errors: errorCount,
          total: audiences.length,
          message: `Synced ${syncedCount} of ${audiences.length} audiences to audience_segments` 
        });
      } catch (error: any) {
        console.error('Sync error:', error);
        return NextResponse.json({ 
          error: error.message || 'Failed to sync audiences',
          success: false 
        }, { status: 500 });
      }
    }

    // Normal POST: Create a new audience segment
    const validated = CreateAudienceSchema.parse(body);

    // Get next version number
    const { data: existing } = await supabase
      .from('audience_segments')
      .select('version')
      .eq('project_id', projectId)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = existing && existing.length > 0 ? (existing[0] as any).version + 1 : 1;

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
      } as any)
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
      payload: { audience_id: (audience as any).id },
    });

    return NextResponse.json({ audience_segment_id: (audience as any).id });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


