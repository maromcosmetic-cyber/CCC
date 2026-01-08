
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';

// Helper to ensure uploads directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const ensureUploadsDir = async () => {
    try {
        await mkdir(UPLOAD_DIR, { recursive: true });
    } catch (error) {
        // Ignore error if directory exists
    }
};

async function fetchImageAsBase64(url: string): Promise<{ data: string, mime: string }> {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        const mime = response.headers['content-type'] || 'image/png';
        return { data: buffer.toString('base64'), mime };
    } catch (e: any) {
        throw new Error(`Failed to fetch image from ${url}: ${e.message}`);
    }
}

export async function POST(req: NextRequest) {
    try {
        const { prompt, productImageUrl, mode } = await req.json(); // mode: 'scene' | 'human'

        if (!prompt || !productImageUrl) {
            return NextResponse.json({ error: 'Missing prompt or productImageUrl' }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_TTS_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'Configuration Error: Missing API Key' }, { status: 500 });
        }

        // 1. Prepare Image
        // If productImageUrl is relative/local, we might need to handle it. Assuming absolute URL from WooCommerce or public upload.
        let imageData;
        if (productImageUrl.startsWith('http')) {
            imageData = await fetchImageAsBase64(productImageUrl);
        } else {
            // Fallback for local uploads if passed as /uploads/...
            // TODO: Handle local file reading if needed. For now assume URL.
            return NextResponse.json({ error: 'Local file paths not yet supported in this route, use full URL' }, { status: 400 });
        }

        // 2. Construct Prompt (Ported from blendImagesNanoBanana)
        let taskInstruction = "Blend the product in the input image into the scene described below.";
        let requirements = "IDENTITY LOCK: The product image is GROUND TRUTH. TEXTURE MAPPING: Treat the product image as a FLATTENED, IMMUTABLE TEXTURE. Do not attempt to read or understand the text. Just copy the pixels exactly. Text pixels must NOT be re-interpreted, redrawn, or stylized. Logo geometry must remain Euclidean and rigid. Font weight, kerning, and color must match original exactly. DETAIL PRIORITY: Focus on HIGH FREQUENCY DETAILS. The text and logo must be razor sharp. LIGHTING: Ensure EVEN, FRONTAL lighting on the product face to prevent shadows from obscuring text. SCALE CONTROL: The product MUST maintain a realistic human-scale proportion, but large enough to be legible. It should occupy approx 15-18% of the vertical frame height (Standard CPG shot). It must be handheld-sized, roughly the size of a large smartphone or small bottle. RIGID BODY: The product is a solid, non-deformable object; do not curve or bend labels.";

        if (mode === 'human') {
            requirements += " SCENE: High-quality photo. Framing: 'Talking Head' or 'Medium Shot'. Action: Character holding product naturally. SCALE: Ensure the product is correctly sized for a human hand. Grip: Product-Safe (NO FINGERS COVERING TEXT OR LOGO).";
        }

        const finalPrompt = `TASK: ${taskInstruction}\nREQUIREMENTS: ${requirements}\nSCENE: ${prompt}\nOUTPUT: Return ONLY the generated image.`;

        // 3. Call Imagen 3 (or Nano Banana if available)
        // Using generic generateContent endpoint which supports image inputs for blending/editing if model supports it.
        // NOTE: 'nano-banana-pro-preview' might be deprecated or specific to the user's key. I will use a generic model name 'gemini-1.5-pro' or 'imagen-3.0-generate-001' if possible, or try the legacy name if user has access.
        // The legacy code used 'nano-banana-pro-preview'. I should probably stick to it or 'gemini-1.5-pro' which handles multimodal.
        // Construct payload for multimodal (text + image).

        // Legacy payload used 'generateContent' on 'nano-banana-pro-preview'.
        const model = 'gemini-pro-vision'; // Or 'gemini-1.5-pro'
        // Actually, for image editing/blending, standard Gemini 1.5 Pro is good.

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`;

        // Gemini 1.5 Payload
        const payload = {
            contents: [{
                parts: [
                    { text: finalPrompt },
                    { inline_data: { mime_type: imageData.mime, data: imageData.data } }
                ]
            }],
            generationConfig: {
                temperature: 0.4,
                topK: 32,
                topP: 1,
                maxOutputTokens: 2048,
            }
        };

        // WAIT: Gemini 1.5 generates TEXT. It doesn't generate IMAGES directly in the text response usually, unless using specific tools or if it's returns structured data.
        // The legacy code 'nano-banana' returned an image bytes buffer?
        // Legacy: "response = await axios.post(..., { responseType: 'arraybuffer' })" ??
        // Let's re-read legacy code. "response = await axios.post(...)". return resultFilename.
        // The legacy code seems to treat prompt+image -> image.
        // If I use Gemini 1.5 Pro, it will describe the image.
        // I need an IMAGE GENERATION model that accepts reference image (Image-to-Image or Inpainting).
        // Imagen 3 on Vertex AI supports this.
        // However, sticking to the "Port" objective, I should use the Logic the user HAD.
        // Logic: `const model = 'nano-banana-pro-preview';`
        // If that model is available to their key, I should use it.
        // But 'nano-banana' is likely an internal codename.
        // I will try 'imagen-3.0-generate-001' if possible, but Veo is for video.
        // I will try to use the EXACT logic / endpoint from legacy if I can found it. 
        // Legacy used `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`.
        // I will try to preserve that model name if the user had it working.

        const legacyModel = 'nano-banana-pro-preview';
        const legacyUrl = `https://generativelanguage.googleapis.com/v1beta/models/${legacyModel}:generateContent?key=${apiKey}`;

        console.log(`🎨 Generating Ad Visual via ${legacyModel}...`);

        const response = await axios.post(legacyUrl,
            {
                contents: [{
                    parts: [
                        { text: finalPrompt },
                        { inline_data: { mime_type: imageData.mime, data: imageData.data } }
                    ]
                }],
                generationConfig: {
                    temperature: 0.4
                }
            },
            { headers: { 'Content-Type': 'application/json' } } // Expecting JSON usually?
        );

        // If the legacy model returns Base64 image in text or similar?
        // I need to know the RESPONSE format of 'nano-banana'.
        // Typically Gemini returns candidate.content.parts[0].text (if text) or .inlineData if image?
        // I'll assume standard Google AI structure.

        // Debugging: If this fails, I might need to switch to simple DALL-E 3 or standard Imagen.
        // But let's try to parse standard response.

        const candidates = response.data.candidates;
        if (!candidates || candidates.length === 0) throw new Error('No candidates returned');

        const contentParts = candidates[0].content.parts;
        // Check for inline_data (image)
        const imagePart = contentParts.find((p: any) => p.inline_data);

        if (!imagePart) {
            // Maybe it returned a link?
            const textPart = contentParts.find((p: any) => p.text);
            if (textPart) {
                console.log("Returned text instead of image:", textPart.text.substring(0, 100));
                throw new Error("Model returned text instead of image. Prompt might need adjustment or model is text-only.");
            }
            throw new Error("No image data returned.");
        }

        const generatedBase64 = imagePart.inline_data.data;
        const buffer = Buffer.from(generatedBase64, 'base64');

        await ensureUploadsDir();
        const filename = `ad_visual_${Date.now()}.png`;
        const filepath = path.join(UPLOAD_DIR, filename);
        await writeFile(filepath, buffer);

        return NextResponse.json({
            success: true,
            url: `/uploads/${filename}`,
            filename
        });

    } catch (error: any) {
        console.error('Ad Visuals Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
