const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function debugGeminiChat() {
    console.log("Starting Gemini Chat Debug (Full Context)...");

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("Missing API Key");

    // Supabase Setup
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing Supabase Credentials");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Hardcoded project ID from debug-chat-api.ts
    const projectId = 'b913e42d-2ef2-4658-a613-b7d7bbe3b401';

    // 1. Fetch Full Brand Context
    console.log("Fetching context...");
    const [
        { data: project },
        { data: products },
        { data: audiences },
        { data: personas }
    ] = await Promise.all([
        supabase.from('projects').select('brand_identity').eq('id', projectId).single(),
        supabase.from('products').select('name, description, price, currency').eq('project_id', projectId).limit(10),
        supabase.from('audience_segments').select('name, description').eq('project_id', projectId).limit(5),
        supabase.from('presenters').select('name, voice_attributes').eq('project_id', projectId).limit(5)
    ]);

    const brandIdentity = project?.brand_identity || {};
    const brandVoice = brandIdentity.voice || {};
    const brandGuardrails = brandIdentity.guardrails || {};
    const brandPositioning = brandIdentity.positioning || {};

    const systemPrompt = `
You are CCC Copyright Engine, an expert-level e-commerce conversion copywriter + strategist.
Your goal is to help the user write high-performing marketing copy.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BRAND INTELLIGENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Brand Voice: ${brandVoice.tone_adjectives?.join(', ') || 'Professional, Authentic'}
- Archetype: ${brandVoice.archetype || 'Not specified'}
- Mission: ${brandPositioning.mission_statement || 'Not specified'}
- Forbidden Words: ${brandGuardrails.forbidden_words?.join(', ') || 'None'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AVAILABLE ASSETS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[PRODUCTS]
${products?.map((p) => `- ${p.name}: ${p.description?.substring(0, 100)}... (${p.price} ${p.currency})`).join('\n') || 'No products found.'}

[AUDIENCES]
${audiences?.map((a) => `- ${a.name}: ${a.description}`).join('\n') || 'No audiences found.'}

[PERSONAS]
${personas?.map((p) => `- ${p.name} (${p.voice_attributes?.tone || 'Neutral'})`).join('\n') || 'No personas found.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Output should be "Ready to Paste" into the editor.
- If the user asks for a draft, provide the full text clearly.
- If the user asks for a revision, rewrite the specific part or the whole text as requested.
- Be concise in your conversational filler; focus on the copy.
- Do NOT be generic. Use the brand voice.
- REFERENCE SPECIFIC PRODUCTS, AUDIENCES, OR PERSONAS if relevant to the user's request.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTERACTION MODEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- The user has a Chat Pane (where you are) and an Editor Pane (where the copy goes).
- You can provide the copy directly in the chat, and the user will copy-paste it.
`;

    console.log("System Prompt Length:", systemPrompt.length);

    // Gemini Setup
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Mock Messages - Scenario with initial greeting
    const messages = [
        { role: 'assistant', content: 'Hello! I am the CCC Copyright Engine.' },
        { role: 'user', content: 'Write a hook for my product.' }
    ];

    const lastMessage = messages[messages.length - 1];

    // Logic from route.ts (exact copy)
    const history = messages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
    }));

    if (history.length > 0 && history[0].role === 'user') {
        history[0].parts[0].text = systemPrompt + "\n\n" + history[0].parts[0].text;
    } else {
        lastMessage.content = systemPrompt + "\n\n" + lastMessage.content;
    }

    console.log("History constructed:", JSON.stringify(history, null, 2));

    try {
        const chat = model.startChat({
            history: history, // Starts with 'model'
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.7,
            },
        });

        console.log("Sending message...");
        const result = await chat.sendMessageStream(lastMessage.content);

        console.log("Stream started...");
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            process.stdout.write(chunkText);
        }
        console.log("\nStream complete.");

    } catch (error) {
        console.error("DEBUG ERROR:", error);
    }
}

debugGeminiChat();
