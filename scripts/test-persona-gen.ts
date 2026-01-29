
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testPersonaGen() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error('No API KEY found');
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    console.log("🧪 Testing Text Generation (Nano Banana)...");
    try {
        const textModel = genAI.getGenerativeModel({ model: "models/nano-banana-pro-preview" });
        const res = await textModel.generateContent("Who are you?");
        console.log("✅ Nano Response:", res.response.text());
    } catch (e: any) {
        console.log("❌ Nano Failed:", e.message);
    }

    console.log("\n🎨 Testing Image Generation (Imagen 3)...");
    try {
        // NOTE: Using raw fetch usually safer for specific tasks if SDK doesn't explicitly type it yet
        const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`; // Predict is often used for Imagen on Vertex, but for Gemini API it might be generateContent
        // Let's try standard generateContent first via SDK
        const imageModel = genAI.getGenerativeModel({ model: "models/imagen-3.0-generate-001" });
        const prompt = "A professional headshot of a creative director, studio lighting, white background";

        const res = await imageModel.generateContent(prompt);
        console.log("✅ Imagen Response Parts:", JSON.stringify(res.response.candidates, null, 2));

    } catch (e: any) {
        console.log("❌ Imagen Failed via SDK:", e.message);

        // Try Raw REST fallback if SDK failed
        console.log("trying raw REST...");
        // ... (Not implemented yet, just checking SDK first)
    }
}

testPersonaGen();
