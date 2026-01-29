import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

// Define tools available to the Copilot
const tools = [
    {
        type: "function",
        function: {
            name: "navigate",
            description: "Navigate the user to a specific path/URL within the application.",
            parameters: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description: "The relative path to navigate to (e.g., '/studio/campaigns', '/settings')."
                    }
                },
                required: ["path"]
            }
        }
    }
];

export async function POST(req: NextRequest) {
    try {
        const { messages, context } = await req.json();

        if (!messages) {
            return NextResponse.json({ error: "Messages are required" }, { status: 400 });
        }

        const systemPrompt = `
You are the AI Copilot for the Commerce Command Center (CCC).
You are helpful, concise, and professional.
You have access to the user's current context:
- Current Query: ${JSON.stringify(context)}

Your goal is to assist the user with navigating the app, answering questions about the interface, and helping with tasks.
If the user asks to go somewhere, use the 'navigate' tool.
If the user asks "Where am I?", use the provided context to answer.
`;

        const response = await openai.chat.completions.create({
            model: "gpt-4-1106-preview",
            messages: [
                { role: "system", content: systemPrompt },
                ...messages
            ],
            tools: tools as any,
            tool_choice: "auto",
        });

        const message = response.choices[0].message;

        // If the model wants to call a tool (Action)
        if (message.tool_calls && message.tool_calls.length > 0) {
            const toolCall = message.tool_calls[0];
            if ((toolCall as any).function.name === 'navigate') {
                const args = JSON.parse((toolCall as any).function.arguments);
                return NextResponse.json({
                    role: "assistant",
                    content: message.content || "Navigating...",
                    action: {
                        type: "NAVIGATE",
                        payload: args.path
                    }
                });
            }
        }

        // Just text response
        return NextResponse.json({
            role: "assistant",
            content: message.content,
            action: null
        });

    } catch (error: any) {
        console.error("Copilot API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
