
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/auth/server';
import { analyzeAdStrategy } from '@/lib/competitor/ad-strategy-analyzer';

export const maxDuration = 300; // 5 minutes max

export async function POST(req: NextRequest) {
    try {
        const { projectId, competitorId } = await req.json();

        if (!projectId || !competitorId) {
            return NextResponse.json({ error: 'Project ID and Competitor ID are required' }, { status: 400 });
        }

        const supabase = createServiceRoleClient();

        // 1. Fetch Competitor Data (including Analysis & Ads)
        const { data: rawCompetitor, error: compError } = await supabase
            .from('competitors')
            .select('*')
            .eq('id', competitorId)
            .single();
        const competitor = rawCompetitor as any;

        if (compError || !competitor) {
            return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
        }

        const analysis = (competitor as any).analysis_json;
        if (!analysis) {
            return NextResponse.json({ error: 'Competitor has not been analyzed yet' }, { status: 400 });
        }

        // 2. Run Strategy Analysis
        console.log(`🧠 Analyzing Ad Strategy for ${competitor.name}...`);

        // Use existing ads_data from analysis output or fallback to null
        const adsData = analysis.ads_data || null;

        const strategyAnalysis = await analyzeAdStrategy(
            competitor.name,
            analysis,
            adsData
        );

        // 3. Save Report back to Competitor record
        // We append it to a new field in the analysis_json or a dedicated column?
        // Let's keep it in analysis_json for simplicity: analysis_json.ad_strategy
        const updatedAnalysis = {
            ...analysis,
            ad_strategy: strategyAnalysis
        };

        const { error: updateError } = await (supabase as any)
            .from('competitors')
            .update({
                analysis_json: updatedAnalysis,
                last_analyzed_at: new Date().toISOString()
            })
            .eq('id', competitorId);

        if (updateError) {
            throw new Error('Failed to save strategy analysis');
        }

        console.log(`✅ Strategy Analysis Saved for ${competitor.name}`);

        // 4. SYNC WITH BRAND PLAYBOOK (Project Level)
        try {
            const { data: project } = await supabase
                .from('projects')
                .select('brand_identity')
                .eq('id', projectId)
                .single();

            if (project) {
                const identity = (project as any).brand_identity || {};
                const marketIntel = identity.market_intelligence || { competitors: [] };

                // Remove existing entry for this competitor if any
                const otherCompetitors = (marketIntel.competitors || []).filter((c: any) => c.name !== competitor.name);

                // Add new insight
                const newInsight = {
                    name: competitor.name,
                    last_updated: new Date().toISOString(),
                    attack_plan: strategyAnalysis.attack_plan,
                    winning_hooks: strategyAnalysis.winning_hooks.map(h => h.hook),
                    top_campaign_idea: strategyAnalysis.campaign_suggestions[0]
                };

                const updatedIdentity = {
                    ...identity,
                    market_intelligence: {
                        ...marketIntel,
                        competitors: [...otherCompetitors, newInsight]
                    }
                };

                await (supabase as any)
                    .from('projects')
                    .update({ brand_identity: updatedIdentity })
                    .eq('id', projectId);

                console.log(`🔄 Synced insights to Brand Playbook for ${competitor.name}`);
            }
        } catch (syncError) {
            console.error('⚠️ Failed to sync with Brand Playbook:', syncError);
            // Don't fail the request, just log it
        }

        return NextResponse.json({
            success: true,
            strategy: strategyAnalysis
        });

    } catch (error: any) {
        console.error('❌ Ad Strategy Analysis Error:', error);
        return NextResponse.json({
            error: error.message || 'Analysis failed',
            details: error.toString()
        }, { status: 500 });
    }
}
