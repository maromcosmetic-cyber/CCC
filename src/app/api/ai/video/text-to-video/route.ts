
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
        // 1. Process Request Body
        const body = await req.json();
        const { prompt } = body;

        if (!prompt) {
            return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
        }

        // 2. Prepare API Key
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_TTS_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'API Configuration Error: Missing API Key' }, { status: 500 });
        }

        // 3. Call Veo 3 Fast API (Text-to-Video)
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-fast-generate-001:predictLongRunning?key=${apiKey}`;

        console.log(`🎥 Starting Veo 3 Fast Text-to-Video generation...`);
        const initialResponse = await axios.post(
            apiUrl,
            {
                instances: [{ prompt: prompt }],
                parameters: {
                    aspectRatio: '16:9'
                }
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const operationId = initialResponse.data.name;
        if (!operationId) {
            throw new Error('No operation ID returned from Veo 3');
        }

        // 4. Poll for Completion
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

        // 5. Download and Save Video
        const videoRes = await axios.get(`${videoUri}&key=${apiKey}`, { responseType: 'arraybuffer' });

        await ensureUploadsDir();
        const filename = `veo3_text_${Date.now()}.mp4`;
        const filepath = path.join(UPLOAD_DIR, filename);

        await writeFile(filepath, videoRes.data);

        // 6. Return Result
        const publicUrl = `/uploads/${filename}`;
        return NextResponse.json({
            success: true,
            url: publicUrl,
            filename: filename
        });

    } catch (error: any) {
        console.error('Veo 3 T2V Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
