
import { NextRequest, NextResponse } from 'next/server';
import { generateStrategicAudiences } from '@/lib/ai/audience-generation';
import { requireAuth } from '@/lib/auth/middleware';
import { createServiceRoleClient } from '@/lib/auth/server';

export const maxDuration = 60; // Allow 60 seconds for AI generation

export async function POST(request: NextRequest) {
    try {
        // 1. Auth check
        const auth = await requireAuth(request);
        if (auth.response) return auth.response;

        const { projectId } = await request.json();

        if (!projectId) {
            return NextResponse.json(
                { error: 'Project ID is required' },
                { status: 400 }
            );
        }


        // 2. Generate Audiences
        console.log(`🧠 Generating Strategic Audiences for project: ${projectId}`);
        const audiences = await generateStrategicAudiences(projectId);

        // 3. Persist to DB
        const supabase = createServiceRoleClient();

        // Fetch existing brand_identity
        const { data: project, error: fetchError } = await supabase
            .from('projects')
            .select('brand_identity')
            .eq('id', projectId)
            .single();

        if (fetchError) throw new Error("Failed to fetch project: " + fetchError.message);

        const currentIdentity = (project as any)?.brand_identity || {};

        // Update with new audiences
        const updatedIdentity = {
            ...currentIdentity,
            audiences: audiences
        };

        // @ts-ignore
        const { error: updateError } = await (supabase as any)
            .from('projects')
            .update({ brand_identity: updatedIdentity })
            .eq('id', projectId);

        if (updateError) throw new Error("Failed to save audiences: " + updateError.message);

        // 4. Sync audiences to audience_segments table
        try {
            // Get next version number for audience_segments
            const { data: existing } = await supabase
                .from('audience_segments')
                .select('version')
                .eq('project_id', projectId)
                .order('version', { ascending: false })
                .limit(1);

            const nextVersion = existing && existing.length > 0 ? (existing[0] as any).version + 1 : 1;

            // Create audience segments from StrategicAudience objects
            for (const audience of audiences) {
                // Check if audience segment already exists
                const { data: existingSegment } = await supabase
                    .from('audience_segments')
                    .select('id')
                    .eq('project_id', projectId)
                    .eq('name', audience.name)
                    .single();

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
                    // Update existing segment
                    const { error: updateError } = await supabase
                        .from('audience_segments')
                        .update(segmentData)
                        .eq('id', existingSegment.id);

                    if (updateError) {
                        console.error(`Failed to update audience segment ${audience.name}:`, updateError);
                    }
                } else {
                    // Insert new segment
                    const { error: insertError } = await supabase
                        .from('audience_segments')
                        .insert(segmentData as any);

                    if (insertError) {
                        console.error(`Failed to create audience segment ${audience.name}:`, insertError);
                    }
                }
            }
        } catch (syncError) {
            console.error('Failed to sync audiences to audience_segments:', syncError);
            // Don't fail the whole request if sync fails - audiences are still saved to brand_identity
        }

        return NextResponse.json({
            success: true,
            audiences
        });

    } catch (error: any) {
        console.error('❌ Audience Generation Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate audiences' },
            { status: 500 }
        );
    }
}
