import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { firecrawl } from '@/lib/firecrawl';

export const maxDuration = 60; // Extend timeout for long scraping/generation

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        let targetUrl = url.trim();
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            targetUrl = 'https://' + targetUrl;
        }

        // 1. Scrape with Firecrawl
        let scrapedData;
        try {
            const result = await firecrawl.scrape(targetUrl, {
                formats: ['markdown'],
            });
            scrapedData = result;
        } catch (scrapeError: any) {
            console.error("Firecrawl error:", scrapeError);
            return NextResponse.json({ error: `Failed to scrape: ${scrapeError.message}` }, { status: 400 });
        }

        const markdown = scrapedData.markdown || '';
        const metadata = scrapedData.metadata || {};

        // Truncate to ~20k chars (GPT-4 Turbo context is large, but be safe)
        const contentSnippet = markdown.slice(0, 25000);

        // 2. Comprehensive Extraction Prompt
        const prompt = `
        You are an AI Brand Intelligence Engine.
        Your role is to analyze scraped website content and fill a predefined Brand Intelligence schema with accurate, inferred, and safe information.

        STRICT RULES:
        - Only fill the fields that exist in the schema
        - If information is missing, infer conservatively based on brand signals
        - NEVER invent medical, legal, or performance claims
        - NEVER exaggerate benefits or promises
        - Use clear, simple language
        - Avoid buzzwords unless clearly used by the brand
        - Prefer neutral confidence over hype
        - Keep answers short and structured
        - Arrays must contain clean, distinct values
        - If a field cannot be inferred with reasonable confidence, leave it empty or mark as "unknown"

        FIELD-SPECIFIC INSTRUCTIONS:

        1. Brand Voice & Language
        - Extract tone from website copy style
        - Use 3–5 adjectives only
        - Avoid emotional extremes unless clearly present

        2. Visual Identity
        - Infer visual mood from language, colors, imagery descriptions
        - Do not assume luxury unless explicitly indicated
        - Prefer lifestyle realism over studio unless stated

        3. Target Audience
        - Base demographics on language, use cases, and pricing signals
        - Do not assume age or gender unless implied

        4. Product Benefits
        - Use cosmetic-safe, non-medical language
        - Focus on experience, ingredients, and routine benefits

        5. Content & Claims Rules
        - Default to conservative claims
        - Avoid before/after, guarantees, or health outcomes

        6. AI Generation Guidance
        - Optimize for realism and brand consistency
        - Avoid extremes in style or pacing

        INPUT DATA:
        Website URL: ${targetUrl}
        Title: ${metadata.title || 'Unknown'}
        Description: ${metadata.description || 'Unknown'}
        
        Content Snippet:
        ${contentSnippet}
        
        OUTPUT RULES:
        - Output must strictly match the provided schema below
        - No explanations or commentary
        - No markdown
        - No emojis
        - No creative writing
        - Structured data only (JSON-compatible)

        The output MUST be a valid JSON object with the following structure:
        {
            "dna": {
                "name": "Brand Name",
                "origin_story": "Why it was created",
                "problem_solved": "What personal problem did they solve?",
                "mission": "What they stand for",
                "personality_adjectives": ["adj1", "adj2"],
                "core_values": ["value1", "value2"],
                "differentiator": "Why different from competitors",
                "anti_identity": "What they never want to be",
                "brand_archetype": "Emotional/Functional/Rebellious/etc",
                "admired_brands": ["brand1"]
            },
            "product": {
                "name": "Top Product Name",
                "category": "Category",
                "main_benefits": ["benefit1", "benefit2"],
                "unique_features": ["feature1"],
                "quality_level": "Premium/Mass/Budget",
                "price_point": "High/Mid/Low",
                "objections": ["objection1"],
                "why_choose_us": "Reason"
            },
            "audience": {
                "ideal_customer": "Description",
                "demographics": { "age": "Range", "gender": "Gender", "income": "Level" },
                "pain_points": ["pain1", "pain2"],
                "desires": ["desire1", "desire2"],
                "fears": ["fear1"],
                "shopping_behavior": "Impulse vs Research"
            },
            "market": {
                "competitors": ["comp1", "comp2"],
                "positioning": "Cheaper/Better/Faster/Emotional?",
                "market_gap": "What is missing in market"
            },
            "offer": {
                "price_strategy": "Premium/Budget",
                "bundles": true/false,
                "subscriptions": true/false
            },
            "voice": {
                "tone_adjectives": ["adj1", "adj2", "adj3"],
                "archetype": "Authority/Friend/Mentor/etc",
                "language_style": {
                    "can_be_provocative": boolean,
                    "use_emojis": "Never/Sometimes/Often",
                    "use_slang": boolean,
                    "sentence_structure": "Short/Long"
                },
                "emotional_driver": "Fear/Desire/Status",
                "perspective": "I/We/You"
            },
            "guardrails": {
                "forbidden_topics": ["topic1"],
                "forbidden_words": ["word1"],
                "allowed_claims": ["claim1"],
                "forbidden_claims": ["claim1"],
                "visual_rules": ["rule1"],
                "tone_limits": "How far can it go?"
            },
            "visuals": {
                "colors": ["#hex1", "#hex2"],
                "fonts": ["font1"],
                "aesthetic": "Clean/Bold/Luxury"
            },
            "creative": {
                "angles": ["angle1", "angle2"],
                "hero_type": "Product vs Person",
                "style": "UGC/Cinematic/etc"
            },
            "one_sentence_summary": "If customer could say one sentence after using product..."
        }
        `;

        const completion = await openai.chat.completions.create({
            model: "gpt-4-1106-preview",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: "You are a brand strategy expert. Output valid JSON only." },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error('No content from OpenAI');

        const brandData = JSON.parse(content);

        return NextResponse.json({ success: true, data: brandData });

    } catch (error: any) {
        console.error("Scrape error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
