
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkApi() {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    console.log(`Fetching from: https://generativelanguage.googleapis.com/v1beta/models?key=...`);

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            console.error("❌ API Error Status:", response.status);
            console.error("❌ Error Body:", JSON.stringify(data, null, 2));
        } else {
            console.log("✅ Success! Models found:");
            console.log((data.models || []).map((m: any) => m.name).join('\n'));
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

checkApi();
