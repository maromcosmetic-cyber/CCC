
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testImagePipeline() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const freepikKey = process.env.FREEPIK_API_KEY;

    if (!apiKey) {
        console.error('❌ No GEMINI_API_KEY found');
        return;
    }

    if (!freepikKey) {
        console.warn("⚠️ No FREEPIK_API_KEY found, skipping enhancement test.");
    }

    // 1. TEST IMAGEN 4.0 FAST (Raw REST)
    console.log("🎨 Testing Imagen 4.0 Fast (Raw REST)...");

    // Note: The endpoint for Gemini API (Generative Language) image generation
    // usually follows: https://generativelanguage.googleapis.com/v1beta/models/{model}:predict
    // Payload for Imagen usually requires specific 'instances' format.

    const model = "models/imagen-4.0-fast-generate-001"; // Trying 4.0 Fast which was in the list
    // Actually, let's try the one that was in the list: imagen-3.0-generate-001
    // But SDK failed 404. Let's try 3.0 via REST.

    const url = `https://generativelanguage.googleapis.com/v1beta/${model}:predict?key=${apiKey}`;

    const payload = {
        instances: [
            {
                prompt: "A professional headshot of a confident female CEO, studio lighting, high resolution, white background"
            }
        ],
        parameters: {
            sampleCount: 1,
            aspectRatio: "1:1" // or "1:1" depending on API version
        }
    };

    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await resp.json();

        if (!resp.ok) {
            console.error(`❌ Imagen Error ${resp.status}:`, JSON.stringify(data, null, 2));
        } else {
            console.log("✅ Imagen Success!");
            // Usually data.predictions[0].bytesBase64Encoded or similar
            if (data.predictions && data.predictions[0]) {
                console.log("✅ Got Image Data (Base64 length):", data.predictions[0].bytesBase64Encoded?.length || "Unknown format");

                const base64Image = data.predictions[0].bytesBase64Encoded;

                // 2. TEST FREEPIK ENHANCE (if we have an image)
                if (freepikKey && base64Image) {
                    console.log("\n✨ Testing Freepik Magnific/Upscale...");
                    // Mocking the Freepik call flow for now as specific Magnific endpoint might vary.
                    // Freepik Upscaler: https://api.freepik.com/v1/ai/upscale

                    const fResponse = await fetch('https://api.freepik.com/v1/ai/upscale', {
                        method: 'POST',
                        headers: {
                            'x-freepik-api-key': freepikKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            image: {
                                base64: base64Image
                            },
                            scale_factor: 2,
                            optimized_for: "quality" // phantom realism
                        })
                    });

                    const fData = await fResponse.json();
                    if (!fResponse.ok) {
                        console.log(`⚠️ Freepik Error ${fResponse.status}:`, JSON.stringify(fData, null, 2));
                    } else {
                        console.log("✅ Freepik Success! Enhanced Image URL/Base64 received.");
                    }
                }
            } else {
                console.log("⚠️ Unexpected Response Structure:", JSON.stringify(data, null, 2));
            }
        }
    } catch (e: any) {
        console.error("❌ Request Failed:", e.message);
    }
}

testImagePipeline();
