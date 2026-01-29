
import { createServiceRoleClient } from '@/lib/auth/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getWooCommerceClient } from '@/lib/woocommerce';
import { extractWooCommerceProducts } from '@/lib/brand/woocommerce-extractor';

// 1. THE STRATEGIC PLAYBOOK (SYSTEM PROMPT)
const AUDIENCE_STRATEGY_PLAYBOOK = `
You are a senior performance marketing strategist and consumer psychologist.
Your task is to design a highly precise, high-converting marketing audience for the given business, product, and campaign.

You must not think in terms of generic demographics.
You must think in terms of human psychology, emotional state, life context, pain, desire, belief systems, and readiness to act.

Your output must follow this structure and logic:

⸻

1. Core Audience Identity (Human First, Not Data First)

Define who this audience is as a person:
	•	How they see themselves
	•	What they value in life
	•	What kind of lifestyle they live
	•	What they are proud of
	•	What annoys them
	•	What they judge others for
	•	What they want to be seen as

This section should describe the audience as a real human archetype, not a targeting group.

⸻

2. Emotional & Psychological Profile

Define:
	•	Their dominant emotional state (stress, fear, ambition, insecurity, hope, etc.)
	•	Their internal conflicts
	•	Their hidden frustrations
	•	Their unspoken fears
	•	Their deepest personal motivations

Explain:
	•	What is emotionally unresolved in their life?
	•	What are they trying to fix, protect, or prove?

⸻

3. Pain Mapping (Why They Are Uncomfortable)

Identify:

Primary Pain:
	•	The main problem they are experiencing (physical, emotional, or social)

Secondary Pain:
	•	The consequences of not solving it
	•	What they are afraid will get worse
	•	What they are avoiding facing

Emotional Cost:
	•	How this pain affects their confidence, relationships, or identity

⸻

4. Desire & Aspiration Mapping (Where They Want To Go)

Define:
	•	What they want to feel
	•	How they want to look
	•	How they want to be perceived
	•	What “a better life” means to them
	•	What version of themselves they are trying to become

Explain:
	•	What success looks like in their mind
	•	What outcome would make them feel relieved, proud, or validated

⸻

5. Belief System & Objections

Define:
	•	What they believe about the problem
	•	What they believe about solutions
	•	What they believe about products like this
	•	What they are skeptical about
	•	What they don’t trust
	•	What they have tried before that failed

List:
	•	Core objections
	•	Emotional resistance
	•	Rational resistance

⸻

6. Awareness Level & Sophistication Level

Determine:
	•	Are they unaware, problem-aware, solution-aware, product-aware, or brand-aware?
	•	Are they beginners, educated, or experts in this space?
	•	Are they overwhelmed or curious?
	•	Are they searching or just reacting?

This must directly influence:
	•	The tone
	•	The depth of explanation
	•	The aggressiveness of the call to action

⸻

7. Buying Intent & Readiness

Evaluate:
	•	How close they are to taking action
	•	What is stopping them
	•	What would push them over the edge
	•	What kind of trigger would make them move (fear, urgency, logic, emotion, social proof, authority)

Classify them as:
	•	Browsers
	•	Researchers
	•	Hesitant buyers
	•	Ready buyers
	•	Repeat buyers

⸻

8. Behavioral Signals & Platform Indicators

Translate the human profile into platform-usable signals:
	•	Likely interests
	•	Likely behaviors
	•	Content they consume
	•	Brands they follow
	•	Influencers they trust
	•	Purchase patterns

This should feel like:
“Because they are X, they are likely to do Y.”

⸻

9. Relationship to the Brand

Define:
	•	Are they a stranger, engager, lead, customer, or repeat buyer?
	•	How much do they trust the brand?
	•	What kind of relationship they want with brands (transactional, emotional, community-based, premium, etc.)

⸻

10. Campaign-Audience Matching Logic

Based on the campaign type, assign the correct audience profile:
	•	Awareness campaign → problem-aware, emotionally resonant audience
	•	Consideration campaign → curious, researching, trust-seeking audience
	•	Conversion campaign → high intent, solution-ready audience
	•	Retention campaign → existing customers, loyalty-driven audience

Explain clearly:
	•	Why this audience fits this campaign
	•	Why other audiences would fail

⸻

11. Audience Quality Scoring

Score the audience on:
	•	Pain intensity (1–10)
	•	Desire intensity (1–10)
	•	Trust level (1–10)
	•	Buying intent (1–10)
	•	Problem awareness (1–10)

Explain the implications of each score.

⸻

12. Final Strategic Summary

Conclude with:
	•	Who this audience really is (in one powerful paragraph)
	•	What they are secretly struggling with
	•	What they truly want
	•	Why this product/service matters to them
	•	Why this campaign will resonate with them

⸻

Critical Rules You Must Follow
	•	Do NOT describe the audience as a targeting group. Describe them as people.
	•	Do NOT be generic. Be emotionally precise.
	•	Do NOT assume. Reason psychologically.
	•	Do NOT focus on the product. Focus on the human state.
	•	Always explain why this audience behaves the way they do.

⸻

Core Philosophy (Never Break This)

People do not buy when they understand.
They buy when they feel understood.

Your job is not to define an audience.
Your job is to decode a human situation.
`;


export interface StrategicAudience {
    category: 'Cold' | 'Warm' | 'Hot' | 'Lookalike' | 'Retention';
    name: string;
    hook_concept: string; // The primary angle/hook
    pain_points: string[]; // Specific to this audience segment
    desires: string[]; // Specific to this audience segment
    identity_upgrade: string; // "From [State A] to [State B]"
    meta_interests: string[]; // Targeting keywords
    age_range: string; // e.g. "25-34"
    awareness_level: string; // e.g. "Problem Aware"
    description: string;
    suggested_products?: string[]; // New: Map specific products
}

export async function generateStrategicAudiences(projectId: string): Promise<StrategicAudience[]> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured on the server.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-pro"
        // Note: responseMimeType: "application/json" might be supported, but safer to let it infer prompt
    });

    const supabase = createServiceRoleClient();

    // 1. Fetch Brand Context
    const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

    if (error || !project) throw new Error('Project not found');

    const brandIdentity = project.brand_identity || {};

    // 2. Fetch WooCommerce Products (Auth first, then Scrape)
    let productContext = "No specific product data found.";
    try {
        let products: any[] = [];

        // Try Authenticated API
        try {
            const woo = await getWooCommerceClient(projectId);
            const response = await woo.get("products", { per_page: 10, status: 'publish' });
            if (response.data && response.data.length > 0) {
                products = response.data.map((p: any) => ({
                    name: p.name,
                    price: p.price,
                    categories: p.categories?.map((c: any) => c.name).join(', '),
                    short_desc: p.short_description?.replace(/<[^>]*>/g, '').slice(0, 100)
                }));
                console.log(`✅ Fetched ${products.length} products via WooCommerce API`);
            }
        } catch (authError) {
            console.warn("⚠️ WooCommerce API failed/not configured, falling back to scraper...");
        }

        // Fallback to Scraper if API returned nothing
        if (products.length === 0 && project.website_url) {
            const scrapeData = await extractWooCommerceProducts(project.website_url);
            if (scrapeData.products.length > 0) {
                products = scrapeData.products.slice(0, 10).map(p => ({
                    name: p.name,
                    price: p.price,
                    categories: p.categories.join(', '),
                    short_desc: p.description.slice(0, 100)
                }));
                console.log(`✅ Scraped ${products.length} products from website`);
            }
        }

        if (products.length > 0) {
            productContext = products.map(p =>
                `- ${p.name} (${p.price}): ${p.short_desc} [Tags: ${p.categories}]`
            ).join('\n');
        }

    } catch (e) {
        console.error("❌ Failed to fetch product context:", e);
    }

    // HELPER: Safely serialize JSON sections
    const getSection = (name: string, data: any) => {
        if (!data) return `${name}: N/A`;
        // Limit large sections to avoid token limits if necessary, but prioritize depth
        return `${name}:\n${JSON.stringify(data, null, 2)}`;
    }

    // Construct Context String (FULL PLAYBOOK)
    const brandContext = `
    BRAND NAME: ${project.name}
    WEBSITE: ${project.website_url}
    
    === REAL INVENTORY (WOOCOMMERCE DATA) ===
    ${productContext}

    === BRAND INTELLIGENCE PLAYBOOK (FULL SCAN) ===
    
    1. BRAND DNA:
    ${getSection('Mission & Identity', brandIdentity.dna)}
    
    2. PRODUCT INTELLIGENCE:
    ${getSection('Product Strategy', brandIdentity.product)}
    
    3. TARGET AUDIENCE & PSYCHOLOGY:
    ${getSection('Audience Profile', brandIdentity.audience)}
    
    4. STRATEGIC POSITIONING:
    ${getSection('Positioning', brandIdentity.positioning)}
    
    5. MARKET LANDSCAPE:
    ${getSection('Competitors & Market', brandIdentity.market)}
    
    6. OFFER ECONOMICS:
    ${getSection('Pricing & Offers', brandIdentity.offer)}
    
    7. CUSTOMER JOURNEY:
    ${getSection('Journey Map', brandIdentity.journey)}
    
    8. VOICE & TONE:
    ${getSection('Voice Guidelines', brandIdentity.voice)}
    
    9. NARRATIVE ARCHITECTURE:
    ${getSection('Story Engine', brandIdentity.narrative)}
    
    10. PAIN MATRIX (DEEP DIVE):
    ${getSection('Pain Hierarchy', brandIdentity.pain_matrix)}
    
    11. CONTENT STRATEGY:
    ${getSection('Content Pillars', brandIdentity.content_pillars)}
    
    12. TRUST & SOCIAL PROOF:
    ${getSection('Trust Signals', brandIdentity.trust_infrastructure)}
    
    13. COMMUNITY MODEL:
    ${getSection('Community Strategy', brandIdentity.community_model)}
    
    14. PLATFORM STRATEGY:
    ${getSection('Channels', brandIdentity.platform_strategy)}
    
    15. LONG TERM VISION:
    ${getSection('Vision', brandIdentity.long_term_vision)}
    `;

    // 2. Call Gemini
    const prompt = `
    ${AUDIENCE_STRATEGY_PLAYBOOK}

    ---
    
    ACT AS: A Senior Performance Marketing Strategist and Consumer Psychologist.
    
    TASK: Generate 5 Strategic Audiences for the Brand described below, strictly applying the 12-Step Deep Psychology Framework provided above.
    
    INPUT DATA:
    ${brandContext}
    
    REQUIRED OUTPUT:
    Generate exactly 5 audiences in this JSON structure. 
    Map the deep psychological insights from the 12-Step Framework into these specific fields:
    
    1. Cold Audience (Problem Aware)
    2. Warm Audience (Brand Aware)
    3. Hot Audience (Buyer Intent)
    4. Lookalike Audience (Scaling)
    5. Retention Audience (Loyalty)
    
    For EACH audience, define:
    - Name: Creative, specific name based on "Core Audience Identity" (e.g. "The Overwhelmed Parent").
    - Hook Concept: The main psychological hook derived from "Emotional & Psychological Profile" + "Belief System".
    - Pain Points: 3 specific pains from "Pain Mapping" (Primary, Secondary, Emotional Cost).
    - Desires: 3 specific desires from "Desire & Aspiration Mapping" (Identity Upgrade, Better Life).
    - Identity Upgrade: The specific "From [Current State] To [Desired Self]" transformation.
    - Meta Interests: 15-20 specific, high-intent targeting keywords from "Behavioral Signals". Focus on specific Brands, Software, Gurus, Tools, and Media they consume.
    - Age Range: The most likely high-converting age bracket (e.g. "25-34", "18-24", "45-64").
    - Awareness Level: From "Awareness Level & Sophistication Level".
    - Description: A rich summary condensing the "Final Strategic Summary" and "Core Audience Identity" sections (100-150 words).
    - Suggested Products: List 1-3 specific product names from the "REAL INVENTORY" that best solve this audience's specific Pain Mapping.
    
    CRITICAL:
    - Do NOT be generic. Use the specific "Pain Matrix" data provided.
    - Use the REAL INVENTORY to suggest products.
    - Deeply analyze the "Consumer Psychology" as per the System Prompt before mapping to JSON.
    - Return ONLY valid JSON.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        if (!text) throw new Error('No content generated by Gemini');

        // Parse JSON (handle potential markdown wrapping)
        let jsonString = text.replace(/```json\n?|\n?```/g, '').trim();
        // Remove text before first { or [ (sometimes models add introductory text)
        const firstBracket = jsonString.indexOf('[');
        const firstBrace = jsonString.indexOf('{');
        const start = (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) ? firstBracket : firstBrace;

        if (start !== -1) {
            jsonString = jsonString.substring(start);
        }

        // Remove text after last } or ]
        const lastBracket = jsonString.lastIndexOf(']');
        const lastBrace = jsonString.lastIndexOf('}');
        const end = (lastBracket !== -1 && lastBracket > lastBrace) ? lastBracket : lastBrace;

        if (end !== -1) {
            jsonString = jsonString.substring(0, end + 1);
        }

        const data = JSON.parse(jsonString);

        return data.audiences || data;
    } catch (err: any) {
        console.error("Gemini Generation Error:", err);
        throw new Error(`Failed to generate audiences with Gemini: ${err.message}`);
    }
}
