
import { createServiceRoleClient } from '../src/lib/auth/server';
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function debugChat() {
    console.log("Starting Debug...");

    try {
        const supabase = createServiceRoleClient();
        console.log("Supabase Client Created");

        // hardcode a known project ID or fetch one
        const { data: projects } = await supabase.from('projects').select('id').limit(1);
        const projectId = projects?.[0]?.id;

        if (!projectId) {
            console.error("No projects found to test with.");
            return;
        }
        console.log("Testing with Project ID:", projectId);

        // 1. Fetch Full Brand Context
        console.log("Fetching context...");
        const [
            { data: project, error: pErr },
            { data: products, error: prErr },
            { data: audiences, error: aErr },
            { data: personas, error: peErr }
        ] = await Promise.all([
            supabase.from('projects').select('brand_identity').eq('id', projectId).single(),
            supabase.from('products').select('name, description, price, currency').eq('project_id', projectId).limit(10),
            supabase.from('audience_segments').select('name, description').eq('project_id', projectId).limit(5),
            supabase.from('presenters').select('name, voice_attributes').eq('project_id', projectId).limit(5)
        ]);

        if (pErr) console.error("Project Error:", pErr);
        if (prErr) console.error("Product Error:", prErr);
        if (aErr) console.error("Audience Error:", aErr);
        if (peErr) console.error("Persona Error:", peErr);

        console.log("Context Fetched.");

        // 2. Google Gemini Test
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        console.log("Gemini Key Check:", apiKey ? "Present (" + apiKey.substring(0, 5) + "...)" : "MISSING");

        if (!apiKey) {
            throw new Error("Google API Key is missing from environment.");
        }

        // Import dynamically or assume build step handles it. 
        // For debug script simplicity we use require if possible or just standard import
        const { GoogleGenerativeAI } = require('@google/generative-ai');

        // Direct fetch to list models
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        console.log("Fetching models list from:", url.replace(apiKey, "HIDDEN_KEY"));

        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach((m: any) => {
                if (m.supportedGenerationMethods?.includes("generateContent")) {
                    console.log(`- ${m.name}`);
                }
            });

            // Pick one to test
            const firstChatModel = data.models.find((m: any) => m.name.includes("gemini") && m.supportedGenerationMethods?.includes("generateContent"));
            if (firstChatModel) {
                const modelName = firstChatModel.name.replace("models/", "");
                console.log(`Testing with found model: ${modelName}`);
                const genAI = new GoogleGenerativeAI(apiKey); // Initialize genAI here
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello!");
                console.log("Response:", (await result.response).text());
            }
        } else {
            console.log("No models returned or error:", data);
        }
        console.log("SUCCESS");
        console.log("SUCCESS");

    } catch (error) {
        console.error("CRITICAL ERROR:", error);
    }
}

debugChat();
