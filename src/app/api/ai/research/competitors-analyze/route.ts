import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/auth/server';
import { analyzeCrossCompetitorInsights } from '@/lib/competitor/competitors-cross-analyzer';

export const maxDuration = 300; // 5 minutes max

export async function POST(req: NextRequest) {
    try {
        const { projectId } = await req.json();

        if (!projectId) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        const supabase = createServiceRoleClient();

        // Fetch all competitors for this project
        console.log('📊 Fetching all competitors for project:', projectId);
        const { data: competitors, error: fetchError } = await supabase
            .from('competitors')
            .select('*')
            .eq('project_id', projectId)
            .eq('status', 'completed')
            .order('created_at', { ascending: false });

        if (fetchError) {
            console.error('❌ Failed to fetch competitors:', fetchError);
            return NextResponse.json({ error: 'Failed to fetch competitors' }, { status: 500 });
        }

        if (!competitors || competitors.length === 0) {
            return NextResponse.json({
                error: 'No competitors found. Please run a competitor analysis first.'
            }, { status: 404 });
        }

        console.log(`✅ Found ${competitors.length} competitors to analyze`);

        // Filter competitors that have analysis data
        const analyzedCompetitors = (competitors as any[]).filter((c: any) => c.analysis_json);

        if (analyzedCompetitors.length === 0) {
            return NextResponse.json({
                error: 'No analyzed competitors found. Please complete competitor analysis first.'
            }, { status: 404 });
        }

        console.log(`🧠 Analyzing ${analyzedCompetitors.length} competitors with complete data...`);

        // Run cross-competitor analysis
        const insights = await analyzeCrossCompetitorInsights(
            analyzedCompetitors.map((c: any) => ({
                name: c.name,
                url: c.url,
                analysis_json: c.analysis_json
            }))
        );

        console.log('✅ Cross-competitor analysis complete');

        // Optionally save insights to project for future reference
        try {
            const { data: project } = await supabase
                .from('projects')
                .select('brand_identity')
                .eq('id', projectId)
                .single();

            if (project) {
                const identity = (project as any).brand_identity || {};
                const updatedIdentity = {
                    ...identity,
                    competitive_insights: {
                        last_analyzed: new Date().toISOString(),
                        insights,
                        competitors_analyzed: analyzedCompetitors.length
                    }
                };

                await (supabase as any)
                    .from('projects')
                    .update({ brand_identity: updatedIdentity })
                    .eq('id', projectId);

                console.log('💾 Saved insights to project brand identity');
            }
        } catch (saveError) {
            console.error('⚠️ Failed to save insights to project:', saveError);
            // Don't fail the request if saving fails
        }

        return NextResponse.json({
            success: true,
            insights,
            competitors_analyzed: analyzedCompetitors.length
        });

    } catch (error: any) {
        console.error('❌ Cross-competitor analysis error:', error);
        return NextResponse.json({
            error: error.message || 'Analysis failed',
            details: error.toString()
        }, { status: 500 });
    }
}
