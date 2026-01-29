
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testFreepikUpscale() {
    const apiKey = process.env.FREEPIK_API_KEY;
    if (!apiKey) {
        console.error('❌ No FREEPIK_API_KEY found');
        return;
    }

    // 1. Create a dummy tiny base64 image (red dot)
    const base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

    console.log("🚀 Sending Upscale Request to Freepik...");

    try {
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
                optimized_for: "quality" // or "creative" if supported
            })
        });

        const data = await resp.json();
        console.log("Response Status:", resp.status);
        console.log("Response Data:", JSON.stringify(data, null, 2));

        // Check if it's a task ID
        // If async, we might get { "data": { "id": "..." } } etc.

        // Attempt to poll if we get a generic task ID/link
        // But first let's see the structure.

    } catch (e: any) {
        console.error("❌ Request Failed:", e.message);
    }
}

testFreepikUpscale();
