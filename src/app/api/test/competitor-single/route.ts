
import { createServiceRoleClient } from '@/lib/auth/server';
import { NextResponse } from 'next/server';
import { fetchCompetitorAds } from '@/lib/competitor/meta-ads-scraper';
import { findCompetitors } from '@/lib/integrations/google-search';
import { scrapeMultipleCompetitors } from '@/lib/competitor/scraper';
import { analyzeCompetitor } from '@/lib/competitor/analyzer';

export async function POST(req: Request) {
    try {
        const { projectId } = await req.json();

        if (!projectId) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        console.log(`✨ SMART SCAN START: Finding best competitor for Project ${projectId}`);
        const supabase = createServiceRoleClient();

        // 1. Get Project Data (for Brand Identity)
        const { data: project } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (!project) throw new Error("Project not found");

        const userWebsite = project.website_url || project.website || "https://example.com";

        // 2. Discover Competitors
        console.log('🔍 Searching Google...');
        const candidates = await findCompetitors(userWebsite, project.brand_identity);

        if (!candidates.length) {
            return NextResponse.json({ success: false, error: "No competitors found" });
        }

        // 3. Select Best Candidate (Top 1)
        const target = candidates[0];
        console.log(`🎯 Target Selected: ${target.title} (${target.url})`);

        // 4. Scrape Website
        console.log(`📡 Scraping ${target.url}...`);
        const scrapeResults = await scrapeMultipleCompetitors([{ url: target.url, title: target.title }]);
        const scrapeData = scrapeResults[0]?.data;

        if (!scrapeData) {
            throw new Error(`Failed to scrape ${target.url}`);
        }

        // 5. AI Analysis
        console.log('🧠 Analyzing with AI...');
        const analysis = await analyzeCompetitor(scrapeData);

        // 6. Fetch Meta Ads
        console.log('📢 Fetching Meta Ads...');
        try {
            const adsData = await fetchCompetitorAds(target.url, projectId);
            if (adsData) {
                analysis.ads_data = adsData;
                console.log(`   ✅ Found ${adsData.total_ads_found} ads`);
            }
        } catch (e) {
            console.error('   ⚠️ Ad fetch failed:', e);
        }

        // 7. Save to Database
        console.log('💾 Saving result...');

        // Check for existing to update or insert
        const { data: existing } = await supabase
            .from('competitors')
            .select('id')
            .eq('project_id', projectId)
            .eq('url', target.url)
            .single();

        let saved;
        if (existing) {
            const { data, error } = await supabase
                .from('competitors')
                .update({
                    name: analysis.competitor_identification.name || target.title,
                    analysis_json: analysis,
                    last_analyzed_at: new Date().toISOString(),
                    status: 'completed'
                })
                .eq('id', existing.id)
                .select()
                .single();
            if (error) throw error;
            saved = data;
        } else {
            const { data, error } = await supabase
                .from('competitors')
                .insert({
                    project_id: projectId,
                    name: analysis.competitor_identification.name || target.title,
                    url: target.url,
                    analysis_json: analysis,
                    last_analyzed_at: new Date().toISOString(),
                    status: 'completed'
                })
                .select()
                .single();
            if (error) throw error;
            saved = data;
        }

        console.log('✅ Smart Scan Complete:', saved.id);
        return NextResponse.json({ success: true, saved: 1, competitor: saved });

    } catch (error: any) {
        console.error('❌ SMART SCAN ERROR:', error);
        return NextResponse.json({ success: false, error: error.message });
    }
}
