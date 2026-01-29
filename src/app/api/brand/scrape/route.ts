import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { firecrawl } from '@/lib/firecrawl';

export const maxDuration = 120; // Extend timeout for comprehensive 19-module extraction

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

        The output MUST be a valid JSON object with ALL 19 MODULES:
        {
            "dna": {
                "name": "Brand Name",
                "origin_story": "Why it was created (narrative)",
                "origin_motivation": "REAL reason created - personal experience",
                "world_problem": "Problem in world/industry trying to fix",
                "emotional_outcome_goal": "What customers should FEEL",
                "problem_solved": "Core problem solved",
                "mission": "What they stand for / do every day",
                "values": "Core values (comma separated)",
                "differentiator": "Main differentiator",
                "anti_identity": "Never want to be associated with",
                "ethical_boundaries": "Won't do even if profitable",
                "non_negotiable_standards": "Quality/honesty standards",
                "ten_year_vision": "Company in 10 years",
                "company_identity_goal": "How want to be remembered"
            },
            "positioning": {
                "market_category": "Category competing in",
                "subcategory_to_own": "Sub-category trying to own",
                "not_for": "Who this is NOT for",
                "remembered_for": "Want to be remembered for",
                "dominant_brand_idea": "Single dominant idea"
            },
            "audience": {
                "ideal_customer": "Description",
                "demographics": { "age": "Range", "gender": "Gender", "income": "Level" },
                "pain_points": ["pain1", "pain2"],
                "desires": ["desire1", "desire2"],
                "fears": ["fear1"],
                "shopping_behavior": "Impulse vs Research",
                "influences": "Who influences them"
            },
            "audience_intelligence": {
                "emotional_triggers": ["trigger1", "trigger2"],
                "identity_drivers": "Who they think they are/want to be",
                "language_style": "How they actually speak",
                "content_behavior": "Where/how consume content",
                "buying_objections": ["objection1"],
                "decision_logic": "Emotional vs rational"
            },
            "pain_matrix": [
                {
                    "problem": "Problem description",
                    "type": "physical|emotional|social|financial|time|identity",
                    "emotional_intensity": 7,
                    "caused_by": "What caused it",
                    "why_persists": "Why it persists",
                    "why_solutions_fail": "Why current solutions fail",
                    "how_feels": "How it makes them feel",
                    "cost_if_unsolved": "Cost if not solved"
                }
            ],
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
            "product_intelligence": {
                "hero_products": ["product1"],
                "support_products": ["product2"],
                "upsell_products": ["product3"],
                "emotional_purposes": "What owning this MEANS"
            },
            "market": {
                "competitors": ["comp1", "comp2"],
                "positioning": "Cheaper/Better/Faster/Emotional?",
                "market_gap": "What is missing in market"
            },
            "offer": {
                "price_strategy": "Premium/Budget",
                "bundles": true,
                "subscriptions": false
            },
            "offer_architecture": {
                "entry_offers": ["offer1"],
                "core_offers": ["offer2"],
                "high_ticket_offers": ["offer3"],
                "scarcity_triggers": ["trigger1"],
                "urgency_logic": "How urgency used",
                "risk_reversal_methods": ["guarantee1"]
            },
            "voice": {
                "tone_adjectives": ["adj1", "adj2", "adj3"],
                "archetype": "Authority/Friend/Mentor/etc",
                "language_style": {
                    "use_emojis": "Never/Sometimes/Often",
                    "use_slang": false,
                    "sentence_structure": "Short/Long"
                },
                "emotional_driver": "Fear/Desire/Status",
                "perspective": "I/We/You",
                "sentence_structure": "Short/Long"
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
            "narrative": {
                "hero": "customer",
                "villain": "problem",
                "guide": "brand",
                "struggle": "The journey",
                "transformation": "Before to After",
                "outcome": "The promised land",
                "story_templates": ["template1"]
            },
            "journey": {
                "discovery": "How they find you",
                "hesitation": "Where they hesitate",
                "after_purchase": "Post-purchase experience"
            },
            "funnel_psychology": {
                "stages": {
                    "awareness": {
                        "emotional_state": "State",
                        "key_questions": ["q1"],
                        "objections": ["obj1"],
                        "content_type": "Type",
                        "desired_action": "Action"
                    }
                }
            },
            "trust_infrastructure": {
                "social_proof_types": ["type1"],
                "testimonial_style": "Style",
                "certifications": ["cert1"],
                "guarantees": ["guarantee1"],
                "transparency_rules": ["rule1"]
            },
            "content_pillars": [
                {
                    "name": "Pillar name",
                    "purpose": "Strategic purpose",
                    "emotional_tone": "Tone",
                    "example_topics": ["topic1"],
                    "platforms": ["platform1"]
                }
            ],
            "community_model": {
                "customer_treatment_rules": "How treat customers",
                "problem_response_protocol": "How handle problems",
                "criticism_handling": "How handle criticism",
                "loyalty_building_tactics": ["tactic1"]
            },
            "platform_strategy": {
                "facebook": {
                    "role": "Why there",
                    "content_type": "Type",
                    "tone": "Tone",
                    "frequency": "Frequency"
                }
            },
            "expansion_vision": {
                "future_products": ["product1"],
                "future_markets": ["market1"],
                "future_positioning": "How will evolve",
                "brand_evolution_path": "Evolution path"
            },
            "kpis": {
                "success_metrics": ["metric1"],
                "benchmarks": "Benchmark targets",
                "growth_targets": "Growth goals"
            },
            "ai_autonomy_rules": {
                "can_decide_alone": ["decision1"],
                "requires_approval": ["decision2"],
                "escalation_logic": "When escalate",
                "risk_thresholds": "Risk limits"
            }
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
