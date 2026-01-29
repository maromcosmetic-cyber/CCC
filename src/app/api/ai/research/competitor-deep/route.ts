import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/auth/server';
import { scrapeMultipleCompetitors } from '@/lib/competitor/scraper';
import { analyzeCompetitor, CompetitorAnalysis } from '@/lib/competitor/analyzer';
import { analyzeAdStrategy } from '@/lib/competitor/ad-strategy-analyzer';
import { calculateNextScanDate } from '@/lib/competitor/monitor';
import { findCompetitors } from '@/lib/integrations/google-search';

export const maxDuration = 300; // 5 minutes for deep analysis

export async function POST(req: NextRequest) {
    try {
        const { projectId, manualUrl } = await req.json();

        if (!projectId) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        // Use service role client for server-side operations
        // This bypasses RLS since we're already authenticated at the page level
        const supabase = createServiceRoleClient();

        // Get project data directly (RLS is disabled on competitors table)
        console.log('📊 Fetching project data for ID:', projectId);
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

        console.log('Project query result:', {
            found: !!project,
            projectId,
            hasError: !!projectError,
            errorMessage: projectError?.message
        });

        if (projectError || !project) {
            console.error('❌ Project not found:', {
                projectId,
                error: projectError,
                message: projectError?.message,
                details: projectError?.details
            });
            return NextResponse.json({
                error: 'Project not found',
                details: projectError?.message || 'No project data returned',
                projectId
            }, { status: 404 });
        }

        console.log('✅ Project found:', (project as any).name);

        let competitorCandidates = [];

        if (manualUrl) {
            console.log('🎯 Manual URL provided, skipping discovery:', manualUrl);
            competitorCandidates = [{
                url: manualUrl,
                title: new URL(manualUrl).hostname // Temporary title until scraped
            }];
        } else {
            const userWebsite = (project as any).website_url || (project as any).website;
            if (!userWebsite) {
                return NextResponse.json({
                    error: 'Website URL not found in project. Please add your website in Brand Identity.'
                }, { status: 400 });
            }

            console.log(`🌐 User website: ${userWebsite}`);

            // STEP 3: Search Google for competitors
            console.log('🔍 Searching Google for competitors...');
            competitorCandidates = await findCompetitors(
                userWebsite,
                (project as any).brand_identity
            );
        }

        if (competitorCandidates.length === 0) {
            return NextResponse.json({
                error: 'No competitors found. Try adding more details to your Brand Identity.'
            }, { status: 404 });
        }

        console.log(`✅ Found ${competitorCandidates.length} competitors`);

        // STEP 4: Scrape all competitor websites
        console.log('📡 Scraping competitor websites...');
        const scrapedCompetitors = await scrapeMultipleCompetitors(
            competitorCandidates.map(c => ({ url: c.url, title: c.title }))
        );

        // Filter out failed scrapes
        const successfulScrapes = scrapedCompetitors.filter(s => s.data !== null);
        console.log(`✅ Successfully scraped ${successfulScrapes.length} competitors`);

        if (successfulScrapes.length === 0) {
            return NextResponse.json({
                error: 'Failed to scrape competitor websites. Please try again later.'
            }, { status: 500 });
        }

        // STEP 5: Analyze each competitor
        console.log('🧠 Analyzing competitors with AI...');
        const analyzedCompetitors: Array<{
            url: string;
            title: string;
            analysis: CompetitorAnalysis;
        }> = [];

        // Limit to 3 competitors to avoid timeouts (reduced from 5)
        const competitorsToAnalyze = successfulScrapes.slice(0, 3);
        console.log(`📊 Analyzing first ${competitorsToAnalyze.length} competitors (out of ${successfulScrapes.length} scraped)`);

        for (let i = 0; i < competitorsToAnalyze.length; i++) {
            const scraped = competitorsToAnalyze[i];
            try {
                console.log(`[${i + 1}/${competitorsToAnalyze.length}] 🧠 Analyzing: ${scraped.url}`);
                console.log(`   📄 Scraped data length: ${JSON.stringify(scraped.data).length} chars`);

                const analysisStart = Date.now();

                // Add timeout per competitor (120 seconds - increased from 60s)
                const analysisPromise = analyzeCompetitor(scraped.data!);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Analysis timeout after 120s')), 120000)
                );

                const analysis = await Promise.race([analysisPromise, timeoutPromise]) as any;
                const analysisTime = Date.now() - analysisStart;

                console.log(`   ✅ Analysis completed in ${analysisTime}ms`);

                // STEP 5b: Fetch Meta Ads Data
                try {
                    console.log(`   📢 Fetching ads for ${scraped.url}...`);
                    // dynamically import to avoid circular dep issues if any, though standard import is fine usually
                    const { fetchCompetitorAds } = await import('@/lib/competitor/meta-ads-scraper');
                    const adsData = await fetchCompetitorAds(scraped.url, projectId);

                    if (adsData) {
                        analysis.ads_data = adsData;
                        console.log(`   ✅ Found ${adsData.total_ads_found} active ads`);
                    } else {
                        console.log(`   ℹ️ No ads data found or integration missing`);
                    }
                } catch (adError) {
                    console.error(`   ⚠️ Failed to fetch ads:`, adError);
                    // Don't fail the whole analysis
                }

                // Add monitoring data
                analysis.monitoring = {
                    last_scan_date: new Date().toISOString(),
                    change_detection: {},
                    alert_triggers: []
                };

                analyzedCompetitors.push({
                    url: scraped.url,
                    title: scraped.title,
                    analysis
                });

                console.log(`   💾 Added to analyzed list (total: ${analyzedCompetitors.length})`);
            } catch (error: any) {
                console.error(`   ❌ Failed to analyze ${scraped.url}:`, error.message);
                console.error(`   ❌ Error details:`, error);
                // Continue with other competitors
            }
        }

        console.log(`✅ Successfully analyzed ${analyzedCompetitors.length} competitors`);

        if (analyzedCompetitors.length === 0) {
            return NextResponse.json({
                error: 'Failed to analyze competitors. Please try again later.'
            }, { status: 500 });
        }

        // STEP 6: Save all competitors to database
        console.log('💾 Saving to database...');
        const savedCompetitors: any[] = [];

        for (const competitor of analyzedCompetitors) {
            try {
                const { data, error } = await (supabase as any)
                    .from('competitors')
                    .insert({
                        project_id: projectId,
                        name: competitor.analysis.competitor_identification.name || competitor.title,
                        url: competitor.url,
                        analysis_json: competitor.analysis,
                        last_analyzed_at: new Date().toISOString(),
                        status: 'completed'
                    })
                    .select()
                    .single();

                if (error) {
                    console.error('Failed to save competitor:', competitor.url, error);
                } else {
                    savedCompetitors.push(data);

                    // STEP 7: Auto-trigger Ad Strategy Analysis
                    try {
                        console.log(`   🧠 Auto-analyzing ad strategy for ${competitor.url}...`);
                        const adStrategy = await analyzeAdStrategy(
                            competitor.analysis.competitor_identification.name || competitor.title,
                            competitor.analysis,
                            competitor.analysis.ads_data || {}
                        );

                        // Update the competitor with ad strategy
                        const updatedAnalysis = {
                            ...competitor.analysis,
                            ad_strategy: adStrategy
                        };

                        await (supabase as any)
                            .from('competitors')
                            .update({ analysis_json: updatedAnalysis })
                            .eq('id', (data as any).id);

                        console.log(`   ✅ Ad strategy analysis complete for ${competitor.url}`);
                    } catch (adStrategyError: any) {
                        console.error(`   ⚠️ Failed to analyze ad strategy for ${competitor.url}:`, adStrategyError.message);
                        // Don't fail the whole process if ad strategy fails
                    }
                }
            } catch (error) {
                console.error('Error saving competitor:', error);
            }
        }

        console.log(`✅ Saved ${savedCompetitors.length} competitors to database`);

        return NextResponse.json({
            success: true,
            totalFound: competitorCandidates.length,
            scraped: successfulScrapes.length,
            analyzed: analyzedCompetitors.length,
            saved: savedCompetitors.length,
            competitors: savedCompetitors
        });

    } catch (error: any) {
        console.error('❌ Competitor discovery error:', error);
        return NextResponse.json({
            error: error.message || 'Analysis failed',
            details: error.toString()
        }, { status: 500 });
    }
}

