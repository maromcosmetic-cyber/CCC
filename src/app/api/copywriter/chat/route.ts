import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServiceRoleClient } from '@/lib/auth/server';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || '');

export async function POST(req: NextRequest) {
    try {
        if (!apiKey) {
            return new NextResponse('Google API key is not configured', { status: 500 });
        }

        const supabase = createServiceRoleClient();
        const body = await req.json();
        const { messages, projectId, document, selection } = body;

        if (!messages || !Array.isArray(messages)) {
            return new NextResponse('Messages array is required', { status: 400 });
        }

        if (!projectId) {
            return new NextResponse('Project ID is required', { status: 400 });
        }

        // 1. Fetch Full Brand Context
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

        const brandIdentity = (project as any)?.brand_identity || {};
        const brandVoice = brandIdentity.voice || {};
        const brandGuardrails = brandIdentity.guardrails || {};
        const brandPositioning = brandIdentity.positioning || {};

        // 2. Build System Prompt
        let systemPrompt = `
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
${products?.map((p: any) => `- ${p.name}: ${p.description?.substring(0, 100)}... (${p.price} ${p.currency})`).join('\n') || 'No products found.'}

[AUDIENCES]
${audiences?.map((a: any) => `- ${a.name}: ${a.description}`).join('\n') || 'No audiences found.'}

[PERSONAS]
${personas?.map((p: any) => `- ${p.name} (${p.voice_attributes?.tone || 'Neutral'})`).join('\n') || 'No personas found.'}
`;

        // Contextual Instruction Switching
        if (selection) {
            systemPrompt += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK: EDIT SELECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The user has selected the following text in their document:
"""
${selection.text}
"""

FULL DOCUMENT CONTEXT:
"""
${document || '(Empty)'}
"""

USER INSTRUCTION:
The user's last message contains the instruction for how to change the selected text.

OUTPUT RULES:
1. Return ONLY the replacement text for the selection.
2. Do NOT include quotation marks, conversational filler (e.g., "Here is the rewritten text:"), or markdown code blocks unless explicitly asked.
3. Ensure the tone matches the Brand Voice.
`;
        } else {
            systemPrompt += `
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
        }

        // 3. Call Google Gemini with Streaming
        // Convert messages to Gemini format (history)
        // Note: Gemini API handles history differently in chat sessions, but for simplicity here we'll concat or try to map.
        // Simple mapping: 
        // User -> user
        // Assistant -> model

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Retrieve the last user message
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role !== 'user') {
            return new NextResponse('Last message must be from user', { status: 400 });
        }

        // Construct history (excluding last message)
        let history = messages.slice(0, -1).map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        // GENAI FIX: History must start with 'user'. Remove leading 'model' messages (e.g. initial greetings).
        while (history.length > 0 && history[0].role === 'model') {
            history.shift();
        }

        // Put system prompt in history as first message (partial workaround for system instruction in basic models) only if supported, 
        // or prepend to the last message / first message. 
        // Better: Use `systemInstruction` if available in this SDK version, or just prepend context to the first message.
        // We will prepend the system prompt to the chat start logic or use it as context.

        // Strategy: Start the chat with the history, but ensure the system prompt is known. 
        // Effectively, we can't easily "inject" system prompt into history as 'system'.
        // We will prepend it to the very first user message in history, or if history is empty, prepend to current prompt.

        if (history.length > 0 && history[0].role === 'user') {
            history[0].parts[0].text = systemPrompt + "\n\n" + history[0].parts[0].text;
        } else {
            // If history is empty, prepend to lastMessage which is the current prompt
            lastMessage.content = systemPrompt + "\n\n" + lastMessage.content;
        }

        const chat = model.startChat({
            history: history,
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.7,
            },
        });

        const result = await chat.sendMessageStream(lastMessage.content);

        // 4. Return Stream
        const stream = new ReadableStream({
            async start(controller) {
                for await (const chunk of result.stream) {
                    const chunkText = chunk.text();
                    if (chunkText) {
                        controller.enqueue(new TextEncoder().encode(chunkText));
                    }
                }
                controller.close();
            },
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        });

    } catch (error) {
        console.error('Error in Copywriter Chat API (Gemini):', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
