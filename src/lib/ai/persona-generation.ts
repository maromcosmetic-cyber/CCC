
import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. PERSONA STRATEGY FRAMEWORK (SYSTEM PROMPT)
const PERSONA_STRATEGY_PLAYBOOK = `
You are a senior brand strategist, casting director, and consumer psychologist.

Your task is to create a complete persona character who will represent the campaign and act as the human face of the brand.

This persona must not be a generic model.
This persona must be the emotional mirror or aspirational guide of the target audience.

You must base every decision on:
	•	audience psychology
	•	emotional state
	•	lifestyle reality
	•	and campaign objective.

You are not creating a character.
You are designing a human bridge between brand and audience.

Follow the structure below exactly.

⸻

1. Persona Role Definition (Mirror or Guide)

First, decide:

Is this persona:
	•	a Mirror (relatable peer – “this is me”)
	•	or a Guide (aspirational/authority – “this is who I want to be”)

Explain clearly:
	•	Why this role is correct for this audience
	•	Why the opposite role would fail

⸻

2. Core Identity

Define the persona as a real person:
	•	First name (for internal reference)
	•	Age range
	•	Gender
	•	Cultural background (if relevant)
	•	Location
	•	Socioeconomic level

Then describe:
	•	Who they are in daily life
	•	How they see themselves
	•	How others see them

This should read like a mini character profile, not a database entry.

⸻

3. Lifestyle & Daily Reality

Describe:
	•	Their job or main life role
	•	Their daily routine
	•	Their family situation
	•	Their social life
	•	Their free time activities

Answer:
	•	What does a normal day look like for them?
	•	Where do they spend time?
	•	Who are they usually with?

This determines authenticity.

⸻

4. Emotional State & Inner World

Define:
	•	Their dominant emotional state (e.g. stressed, hopeful, insecure, ambitious, calm)
	•	Their internal conflicts
	•	Their hidden worries
	•	Their unspoken frustrations
	•	Their quiet hopes

Explain:
	•	What are they trying to fix in their life?
	•	What are they afraid of becoming?
	•	What are they trying to protect?

This is the emotional engine of the persona.

⸻

5. Personality Traits

Choose 3–5 dominant traits and explain each:

Examples:
	•	Warm
	•	Grounded
	•	Ambitious
	•	Gentle
	•	Confident
	•	Practical
	•	Elegant
	•	Protective
	•	Playful

Then explain:
	•	How these traits show in behavior
	•	How they show in communication
	•	How they show in body language

⸻

6. Communication Style

Define:
	•	How they speak (fast/slow, calm/energetic, emotional/logical)
	•	Their tone (soft, direct, reassuring, inspiring, friendly)
	•	Their language level (simple, refined, professional, casual)
	•	Whether they explain, demonstrate, or empathize

Then answer:
	•	If this person spoke to the viewer, how would it feel?

This controls script, voice, and delivery.

⸻

7. Visual Language & Appearance

Define clearly:
	•	Clothing style (casual, premium, athletic, minimal, etc.)
	•	Grooming level
	•	Makeup level (if relevant)
	•	Accessories
	•	Color palette
	•	Overall visual energy

Explain:
	•	Why this look matches the audience
	•	Why this look supports the brand
	•	Why this look builds trust (not intimidation)

No fashion opinions. Only strategic reasoning.

⸻

8. Relatability vs Aspiration Balance

Determine:

Is this persona meant to be:
	•	fully relatable
	•	slightly aspirational
	•	strongly aspirational

Explain:
	•	What emotional reaction we want from the audience:
	•	“She’s like me”
	•	“I want to be like her”
	•	or “I trust her”

This must align with:
	•	audience insecurity level
	•	product sensitivity
	•	campaign goal

⸻

9. Trust & Credibility Signals

Define:
	•	Why would the audience trust this person?
	•	What makes them believable?
	•	What makes them safe?
	•	What makes them non-threatening?

This can include:
	•	age
	•	tone
	•	appearance
	•	demeanor
	•	background

Explain the psychology.

⸻

10. What This Persona Must Never Be

Define clearly:
	•	What traits would break trust?
	•	What type of look would feel wrong?
	•	What energy would repel the audience?
	•	What stereotype must be avoided?

This prevents costly mistakes.

⸻

11. Casting Criteria (If Choosing a Real Presenter)

List clear requirements:
	•	Age range
	•	Energy type
	•	Emotional range needed
	•	Authenticity level
	•	Experience level (actor, real person, influencer, etc.)

Then explain:
	•	What you would look for in a casting audition
	•	What would be an immediate “no”
	•	What would be a strong “yes”

This should guide real-world selection.

⸻

12. Campaign Fit Explanation

Finally, explain:
	•	Why this persona is perfect for this campaign
	•	Why this persona will resonate emotionally
	•	Why this persona will reduce resistance
	•	Why this persona will increase trust and conversion

Connect:
audience → persona → emotional reaction → campaign success
`;


export interface PersonaProfile {
    role: 'Mirror' | 'Guide';
    name: string;
    age_range: string;
    occupation: string;
    emotional_state: string;
    core_concerns: string;
    personality_traits: string[];
    visual_style: string;
    communication_style: string;
    trust_signals: string;
    avoid_traits: string;
    casting_notes: string;
    image_prompt: string; // The crucial prompt for the image generator
    imageUrl?: string; // Optional URL if the persona image has been generated
}

// Helper to enhance image with Freepik
async function enhanceImageWithFreepik(base64Image: string): Promise<string> {
    const apiKey = process.env.FREEPIK_API_KEY;
    if (!apiKey) {
        console.warn("⚠️ No FREEPIK_API_KEY, skipping enhancement.");
        return base64Image;
    }

    try {
        console.log("✨ Calling Freepik Magnific/Upscale API...");
        // Assuming standard endpoint for now, but will log error silently if fails
        const resp = await fetch('https://api.freepik.com/v1/ai/upscale', {
            method: 'POST',
            headers: {
                'x-freepik-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: {
                    base64: base64Image
                },
                scale_factor: 2,
                optimized_for: "quality"
            })
        });

        const data = await resp.json();

        // If async task returned:
        if (data && data.data && data.data.id) {
            // For async, we'd need to poll. 
            // To keep this MVP simple/responsive, we might skip full polling here if it takes >30s.
            // Or assume synchronous response if Freepik supports it with a header.
            // If we assume it's async only, we'll return original and log "Upscaling started task X".
            console.log(`⚠️ Freepik started async task ${data.data.id} - returning original for MVP speed`);
            return base64Image;
        }

        // If direct image returned (rare for high-res upscaling but possible):
        if (data && data.data && data.data.base64) {
            return data.data.base64;
        }

        return base64Image;

    } catch (e: any) {
        console.warn("⚠️ Freepik Enhancement Failed (Returning Original):", e.message);
        return base64Image;
    }
}


export async function generatePersona(audienceContext: any, projectId: string): Promise<{ profile: PersonaProfile, imageUrl: string }> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured on the server.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // 1. Text Generation Model
    const textModel = genAI.getGenerativeModel({ model: "models/nano-banana-pro-preview" });

    // --- STEP 1: Generate Text Profile ---
    const prompt = `
    ${PERSONA_STRATEGY_PLAYBOOK}

    ---
    TASK: Create a Persona for this specific Audience Segment:
    ${JSON.stringify(audienceContext, null, 2)}

    REQUIRED OUTPUT FORMAT (JSON):
    {
        "role": "Mirror" | "Guide",
        "name": "Name",
        "age_range": "e.g. 30-35",
        "occupation": "...",
        "emotional_state": "...",
        "core_concerns": "Main internal conflict",
        "personality_traits": ["Trait 1", "Trait 2", ...],
        "visual_style": "Clothing, grooming, colors...",
        "communication_style": "...",
        "trust_signals": "...",
        "avoid_traits": "...",
        "casting_notes": "...",
        "image_prompt": "A highly detailed, photorealistic portrait of this exact person. Describe physical appearance, lighting, clothing, facial expression, and background. WHITE BACKGROUND. Professional photography, high resolution 8k, sharp focus, natural skin texture, realistic facial features, authentic expression, lifelike appearance, no AI artifacts, no oversaturation, no blur, no distortion, natural lighting, professional studio quality, razor sharp details, photorealistic quality, realistic skin pores and texture, natural hair details, authentic human appearance."
    }
    `;

    let profile: PersonaProfile;

    try {
        const result = await textModel.generateContent(prompt);
        const text = result.response.text();
        const jsonString = text.replace(/```json\n?|\n?```/g, '').trim();
        profile = JSON.parse(jsonString);
    } catch (e: any) {
        console.warn("⚠️ Nano model failed/unavailable, falling back to Gemini 2.5 Pro", e.message);
        const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
        const result = await fallbackModel.generateContent(prompt);
        const text = result.response.text();
        const jsonString = text.replace(/```json\n?|\n?```/g, '').trim();
        profile = JSON.parse(jsonString);
    }

    // --- STEP 2: Generate Image (Imagen 4.0 Fast via REST) ---
    let imageUrl = "/placeholder-persona.png";

    try {
        console.log("🎨 Generating Image with prompt:", profile.image_prompt);

        // Use REST call directly for Imagen 4.0 (prefer quality over speed for personas)
        // Using imagen-4.0-generate-001 for better quality (slower but more realistic)
        const imageModel = "models/imagen-4.0-generate-001";
        const url = `https://generativelanguage.googleapis.com/v1beta/${imageModel}:predict?key=${apiKey}`;

        // Enhanced prompt with negative prompts to avoid AI artifacts
        const enhancedPrompt = `${profile.image_prompt}. Negative: blurry, distorted, AI-generated look, oversaturated, cartoonish, unrealistic, fake, artificial, low quality, pixelated, artifacts, glitches, unnatural skin, plastic appearance.`;

        const payload: any = {
            instances: [{ prompt: enhancedPrompt }],
            parameters: {
                sampleCount: 1,
                aspectRatio: "1:1",
                // Guidance scale for strict prompt adherence (photorealistic quality)
                // API will ignore if not supported
                guidanceScale: 11
            }
        };

        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await resp.json();

        if (resp.ok && data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
            let base64 = data.predictions[0].bytesBase64Encoded;

            // --- STEP 3: Enhance with Freepik (upscaling + skin enhancement) ---
            // This improves sharpness and realism significantly
            try {
                console.log("✨ Enhancing persona image with Freepik (upscaling + skin enhancement)...");
                const { enhanceImageForRealism } = await import('@/lib/product-image/realism-enhancer');
                // Use 4x upscaling for maximum sharpness, and enable skin enhancement
                base64 = await enhanceImageForRealism(base64, 'product_persona', 4);
                console.log("✅ Persona image enhanced successfully");
            } catch (enhanceError: any) {
                console.warn("⚠️ Image enhancement failed, using original:", enhanceError.message);
                // Continue with original if enhancement fails
            }

            imageUrl = `data:image/png;base64,${base64}`;
        } else {
            console.error("❌ Imagen Error Response:", JSON.stringify(data));
        }

    } catch (e: any) {
        console.error("❌ Image Generation Failed:", e.message);
    }

    return { profile, imageUrl };
}
