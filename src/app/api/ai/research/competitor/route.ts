
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/auth/server';
import { firecrawl } from '@/lib/integrations/firecrawl';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { url, projectId, mode = 'analyze', niche } = await req.json();

        if (!projectId) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        // MODE 1: ANALYZE SPECIFIC URL
        if (mode === 'analyze' && url) {
            // ... (existing analyze logic) ...
            // 1. Scrape Website
            const scrapedData = await firecrawl.scrapeUrl(url);

            if (!scrapedData || !scrapedData.content) {
                return NextResponse.json({ error: 'Failed to scrape website' }, { status: 500 });
            }

            // 2. Analyze with Gemini
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const prompt = `
        You are a Chief Marketing Officer analyzing a competitor.
        
        Analyze the following website content for the brand at ${url}.
        
        Content:
        "${scrapedData.content.substring(0, 15000)}" 
        
        Generate a comprehensive JSON report with the following structure:
        {
          "brand_identity": {
            "voice_tone": "string",
            "target_audience": "string",
            "key_value_props": ["string"]
          },
          "swot": {
            "strengths": ["string"],
            "weaknesses": ["string"],
            "opportunities": ["string"],
            "threats": ["string"]
          },
          "ad_strategy": {
            "suspected_angles": ["string"],
            "hooks_used": ["string"],
            "ctas_used": ["string"]
          },
          "counter_strategy": {
             "how_to_beat_them": "string",
             "recommended_ad_angles": ["string"]
          }
        }
        
        Return ONLY valid JSON.
      `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Clean JSON
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const report = JSON.parse(jsonStr);

            // 3. Save to DB
            const { data: inserted, error } = await supabase
                .from('competitors')
                .upsert({
                    project_id: projectId,
                    url: url,
                    name: scrapedData.title || url,
                    analysis_json: report,
                    status: 'completed',
                    last_analyzed_at: new Date().toISOString()
                } as any, { onConflict: 'url, project_id' }) // Assuming generic constraint or handle duplicates logic
                .select()
                .single();

            if (error) {
                console.error("DB Save Error:", error);
                // Don't fail the request if DB save fails, just return data
            }

            return NextResponse.json({ success: true, report });
        }

        // MODE 2: DISCOVER COMPETITORS
        if (mode === 'discover' && niche) {
            // 1. Search Google
            const searchResults = await firecrawl.searchGoogle(`${niche} competitors brands store`);

            // 2. Filter Results (Basic)
            const companies = searchResults.map((r: any) => ({
                title: r.title,
                url: r.url,
                description: r.description
            })).slice(0, 8); // Top 8

            return NextResponse.json({ success: true, companies });
        }

        return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

    } catch (error: any) {
        console.error('Competitor Analytics Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
