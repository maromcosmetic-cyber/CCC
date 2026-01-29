
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CompetitorAnalysis } from './analyzer';

export interface WinningAd {
    ad_creative_body: string;
    ad_creative_link_title?: string;
    platform: string;
    ad_delivery_start_time?: string;
    success_analysis: {
        hook_strength: string;
        psychological_triggers: string[];
        why_it_works: string;
        target_audience_fit: string;
    };
    meta_ad_library_url?: string;
}

export interface AdStrategyAnalysis {
    winning_ads: WinningAd[];
    winning_hooks: Array<{
        hook: string;
        why_it_works: string;
        estimated_effectiveness: 'High' | 'Medium' | 'Low';
    }>;
    creative_patterns: Array<{
        type: string;
        description: string;
        frequency: 'Dominant' | 'Common' | 'Rare';
    }>;
    funnel_diagnosis: {
        structure: string; // e.g., "Meta Ad -> VSL -> Checkout"
        friction_points: string[];
        conversion_triggers: string[];
    };
    psychological_triggers: Array<{
        trigger: string;
        application: string;
    }>;
    attack_plan: {
        weakness_to_exploit: string;
        counter_strategy: string;
        differentiation_angle: string;
    };
    campaign_suggestions: Array<{
        name: string;
        angle: string;
        headline: string;
        primary_text: string;
        visual_concept: string;
        target_audience: string;
        reasoning: string;
    }>;
}

export async function analyzeAdStrategy(
    competitorName: string,
    analysis: CompetitorAnalysis,
    adsData: any
): Promise<AdStrategyAnalysis> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    // Select top 5 ads for detailed analysis
    const topAds = adsData?.raw_ads?.slice(0, 5) || [];

    // Filter relevant sections to keep context manageable but rich
    const context = {
        identity: analysis.competitor_identification,
        positioning: analysis.brand_positioning_extraction,
        audience: analysis.target_audience_signals,
        offers: analysis.offer_structure_pricing,
        messaging: analysis.content_strategy_messaging,
        weaknesses: analysis.weakness_detection,
        ads_summary: {
            total_active: adsData?.total_ads_found || 0,
            platforms: adsData?.ad_platforms || [],
            copy_themes: adsData?.ad_copy_themes || [],
            headlines: adsData?.common_headlines || [],
            creative_styles: adsData?.ad_creative_styles || [],
        },
        top_5_ads: topAds.map((ad: any, index: number) => ({
            index: index + 1,
            body: ad.ad_creative_bodies?.[0] || '',
            link_caption: ad.ad_creative_link_captions?.[0] || '',
            link_title: ad.ad_creative_link_titles?.[0] || '',
            platform: ad.publisher_platform || 'facebook',
            start_date: ad.ad_delivery_start_time || ''
        }))
    };

    const prompt = `
    You are a World-Class Direct Response Marketing Strategist and Media Buyer.
    
    OBJECTIVE:
    Reverse-engineer the advertising strategy of "${competitorName}" based on their brand analysis and active ad data.
    Then, prescribe a winning campaign strategy for a competitor entering this market.

    INPUT DATA:
    ${JSON.stringify(context, null, 2)}

    YOUR TASK:
    1. **Analyze Top 5 Winning Ads**: For each of the top_5_ads, provide a detailed success analysis explaining:
       - What makes the hook compelling
       - Psychological triggers being used
       - Why it works for their target audience
       - How well it fits their positioning
    2. Analyze their Ad Creatives & Copy: Identify the psychological hooks and persistent patterns.
    3. Diagnose their Funnel: Infer their customer journey from ad to sale.
    4. Find the Gaps: Where is their messaging weak? What emotional angles are they missing?
    5. CREATE A BATTLE PLAN: Suggest specific campaigns to beat them.

    OUTPUT FORMAT:
    Return a SINGLE valid JSON object matching this structure:

    {
        "winning_ads": [
            {
                "ad_creative_body": "Full ad copy from the input",
                "ad_creative_link_title": "Link title if available",
                "platform": "facebook or instagram",
                "ad_delivery_start_time": "Start date from input",
                "success_analysis": {
                    "hook_strength": "Detailed explanation of what makes the opening hook powerful",
                    "psychological_triggers": ["Scarcity", "Social Proof", "Authority"],
                    "why_it_works": "Comprehensive analysis of why this ad is successful",
                    "target_audience_fit": "How well this ad resonates with their target audience"
                }
            }
        ],
        "winning_hooks": [
            { "hook": "The 'Us vs Them' angle", "why_it_works": "Leverages tribalism...", "estimated_effectiveness": "High" }
        ],
        "creative_patterns": [
            { "type": "UGC Testimonial", "description": "Selfie-style videos focusing on...", "frequency": "Dominant" }
        ],
        "funnel_diagnosis": {
            "structure": "Ad -> Quiz -> Offer",
            "friction_points": ["Lengthy quiz"],
            "conversion_triggers": ["Instant discount code"]
        },
        "psychological_triggers": [
            { "trigger": "Status Anxiety", "application": "Shows users missing out on..." }
        ],
        "attack_plan": {
            "weakness_to_exploit": "Generic messaging",
            "counter_strategy": "Hyper-specific personalization",
            "differentiation_angle": "The premium alternative"
        },
        "campaign_suggestions": [
            {
                "name": "The 'Truth' Campaign",
                "angle": "Educational/Debunking",
                "headline": "Stop wasting money on X",
                "primary_text": "long form copy...",
                "visual_concept": "Side-by-side comparison",
                "target_audience": "Frustrated switchers",
                "reasoning": "Directly attacks their weakness..."
            }
        ]
    }
    
    CRITICAL: Ensure you analyze ALL ${topAds.length} ads from top_5_ads and include them in the winning_ads array.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response.text();

        let jsonString = response.replace(/```json\n?|\n?```/g, '').trim();
        const start = jsonString.indexOf('{');
        const end = jsonString.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            jsonString = jsonString.substring(start, end + 1);
        }

        return JSON.parse(jsonString);
    } catch (error: any) {
        console.error('Ad Strategy Analysis Failed:', error);
        throw new Error(`Strategy analysis failed: ${error.message}`);
    }
}
