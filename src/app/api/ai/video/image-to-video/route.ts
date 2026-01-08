
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

export async function POST(req: NextRequest) {
    try {
        // 1. Process FormData
        const formData = await req.formData();
        const prompt = formData.get('prompt') as string;
        const imageFile = formData.get('image') as File;

        if (!prompt || !imageFile) {
            return NextResponse.json({ error: 'Missing prompt or image' }, { status: 400 });
        }

        // 2. Prepare API Key
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_TTS_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'API Configuration Error: Missing API Key' }, { status: 500 });
        }

        // 3. Convert File to Base64
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = buffer.toString('base64');
        const mimeType = imageFile.type || 'image/png';

        // 4. Call Veo 3 Fast API (Start Generation)
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-fast-generate-001:predictLongRunning?key=${apiKey}`;

        console.log(`🎥 Starting Veo 3 Fast Image-to-Video generation...`);
        const initialResponse = await axios.post(
            apiUrl,
            {
                instances: [{
                    prompt: prompt,
                    image: {
                        bytesBase64Encoded: base64Image,
                        mimeType: mimeType
                    }
                }],
                parameters: {
                    aspectRatio: '16:9' // Defaulting to 16:9 for now, could be passed in
                }
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const operationId = initialResponse.data.name;
        if (!operationId) {
            throw new Error('No operation ID returned from Veo 3');
        }

        // 5. Poll for Completion
        let videoUri = null;
        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
            attempts++;

            const statusRes = await axios.get(
                `https://generativelanguage.googleapis.com/v1beta/${operationId}?key=${apiKey}`
            );

            if (statusRes.data.done) {
                videoUri = statusRes.data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
                if (!videoUri) {
                    throw new Error('Generation finished but no video URI found.');
                }
                break;
            }
        }

        if (!videoUri) {
            throw new Error('Timeout waiting for video generation.');
        }

        // 6. Download and Save Video
        const videoRes = await axios.get(`${videoUri}&key=${apiKey}`, { responseType: 'arraybuffer' });

        await ensureUploadsDir();
        const filename = `veo3_${Date.now()}.mp4`;
        const filepath = path.join(UPLOAD_DIR, filename);

        await writeFile(filepath, videoRes.data);

        // 7. Return Result
        const publicUrl = `/uploads/${filename}`;
        return NextResponse.json({
            success: true,
            url: publicUrl,
            filename: filename
        });

    } catch (error: any) {
        console.error('Veo 3 I2V Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
