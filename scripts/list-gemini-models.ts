
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error('No API KEY found');
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Note: listModels is not directly exposed on genAI instance in some SDK versions,
    // but let's try via the model manager if accessible or just a simple generation test.
    // Actually, the SDK doesn't always have a listModels method easily accessible without the ModelService.

    // Let's try to brute force commonly known models with a "Hello" prompt.
    const models = [
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-1.5-flash-latest",
        "gemini-1.5-pro-latest",
        "gemini-pro",
        "gemini-1.0-pro"
    ];

    console.log("Checking model availability...");

    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello", { timeout: 5000 });
            console.log(`✅ ${modelName}: AVAILABLE`);
        } catch (e: any) {
            if (e.message.includes('404')) {
                console.log(`❌ ${modelName}: Not Found (404)`);
            } else {
                console.log(`⚠️ ${modelName}: Error ${e.message}`);
            }
        }
    }
}

listModels();
