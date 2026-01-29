import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface CrossCompetitorInsights {
    winning_campaigns: Array<{
        competitor_name: string;
        campaign_description: string;
        why_successful: string;
        key_tactics: string[];
        applicability_to_your_brand: string;
    }>;
    success_patterns: Array<{
        pattern_name: string;
        description: string;
        frequency: string;
        competitors_using: string[];
        recommended_implementation: string;
    }>;
    market_opportunities: Array<{
        opportunity: string;
        gap_identified: string;
        potential_impact: 'High' | 'Medium' | 'Low';
        action_steps: string[];
    }>;
    recommended_actions: Array<{
        priority: 'High' | 'Medium' | 'Low';
        action: string;
        rationale: string;
        expected_outcome: string;
        implementation_difficulty: 'Easy' | 'Medium' | 'Hard';
    }>;
    strategic_insights: {
        market_landscape: string;
        competitive_positioning_advice: string;
        differentiation_opportunities: string[];
        threats_to_address: string[];
    };
}

export async function analyzeCrossCompetitorInsights(
    competitors: Array<{
        name: string;
        url: string;
        analysis_json: any;
    }>
): Promise<CrossCompetitorInsights> {
    console.log(`🧠 Starting cross-competitor analysis for ${competitors.length} competitors...`);

    // Prepare aggregated data
    const competitorSummaries = competitors.map(comp => {
        const analysis = comp.analysis_json;
        return {
            name: comp.name,
            url: comp.url,
            positioning: analysis.brand_positioning_extraction?.positioning_statement || 'N/A',
            core_promise: analysis.brand_positioning_extraction?.core_promise || 'N/A',
            target_audience: analysis.target_audience_signals?.demographics || {},
            pricing: analysis.offer_structure_pricing?.price_ranges || 'N/A',
            weaknesses: analysis.weakness_detection || {},
            ad_strategy: analysis.ad_strategy || null,
            winning_ads: analysis.ad_strategy?.winning_ads || [],
            winning_hooks: analysis.ad_strategy?.winning_hooks || [],
            campaign_suggestions: analysis.ad_strategy?.campaign_suggestions || [],
            attack_plan: analysis.ad_strategy?.attack_plan || null,
            content_pillars: analysis.content_strategy_messaging?.content_pillars || [],
            visual_identity: analysis.visual_identity_aesthetic || {},
            trust_signals: analysis.trust_authority_signals || {},
            market_gaps: analysis.strategic_insight_synthesis?.market_gaps || [],
            positioning_opportunities: analysis.strategic_insight_synthesis?.positioning_opportunities || []
        };
    });

    const prompt = `You are a strategic marketing analyst. Analyze the following ${competitors.length} competitors and provide actionable insights for OUR brand.

COMPETITORS DATA:
${JSON.stringify(competitorSummaries, null, 2)}

Your task is to:
1. Identify the TOP 5 most successful campaigns across ALL competitors (based on their winning ads and strategies)
2. Extract common SUCCESS PATTERNS that work across multiple competitors
3. Identify MARKET OPPORTUNITIES and gaps that our brand can exploit
4. Provide SPECIFIC, ACTIONABLE recommendations for our brand
5. Give strategic insights about the competitive landscape

IMPORTANT GUIDELINES:
- Focus on ACTIONABLE insights, not generic advice
- Prioritize tactics that have proven success across multiple competitors
- Identify specific weaknesses in competitors that we can exploit
- Suggest concrete implementation steps
- Be specific about WHY each recommendation will work

Return a JSON object with this EXACT structure:
{
    "winning_campaigns": [
        {
            "competitor_name": "string",
            "campaign_description": "string (concise, 1-2 sentences)",
            "why_successful": "string (specific reasons)",
            "key_tactics": ["tactic1", "tactic2", "tactic3"],
            "applicability_to_your_brand": "string (how we can adapt this)"
        }
    ],
    "success_patterns": [
        {
            "pattern_name": "string",
            "description": "string",
            "frequency": "Used by X out of Y competitors",
            "competitors_using": ["competitor1", "competitor2"],
            "recommended_implementation": "string (specific steps)"
        }
    ],
    "market_opportunities": [
        {
            "opportunity": "string (concise)",
            "gap_identified": "string (what competitors are missing)",
            "potential_impact": "High|Medium|Low",
            "action_steps": ["step1", "step2", "step3"]
        }
    ],
    "recommended_actions": [
        {
            "priority": "High|Medium|Low",
            "action": "string (specific action)",
            "rationale": "string (why this matters)",
            "expected_outcome": "string (what we'll achieve)",
            "implementation_difficulty": "Easy|Medium|Hard"
        }
    ],
    "strategic_insights": {
        "market_landscape": "string (2-3 sentences about the overall market)",
        "competitive_positioning_advice": "string (how to position against these competitors)",
        "differentiation_opportunities": ["opportunity1", "opportunity2", "opportunity3"],
        "threats_to_address": ["threat1", "threat2", "threat3"]
    }
}

CRITICAL: Return ONLY valid JSON, no markdown formatting, no explanations outside the JSON.`;

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8000,
            }
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Clean up the response
        let cleanedText = text.trim();
        if (cleanedText.startsWith('```json')) {
            cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
        } else if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/```\n?/g, '');
        }

        const insights = JSON.parse(cleanedText);

        console.log('✅ Cross-competitor analysis complete');
        return insights;

    } catch (error: any) {
        console.error('❌ Cross-competitor analysis failed:', error);
        throw new Error(`Failed to analyze competitors: ${error.message}`);
    }
}
