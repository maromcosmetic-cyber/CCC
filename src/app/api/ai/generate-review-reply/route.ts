import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_TTS_KEY || process.env.KIE_AI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(request: NextRequest) {
    try {
        const { reviewText, starRating, businessName } = await request.json();

        if (!reviewText) {
            return NextResponse.json({ error: 'Review text is required' }, { status: 400 });
        }

        const prompt = `You are a professional customer service representative for ${businessName || 'our business'}. 

A customer left the following ${starRating}-star review:
"${reviewText}"

Generate a professional, empathetic, and personalized response that:
1. Thanks the customer for their feedback
2. Addresses specific points they mentioned
3. ${starRating >= 4 ? 'Expresses gratitude and encourages them to return' : 'Apologizes for any issues and offers to make it right'}
4. Is warm but professional (2-3 sentences max)
5. Does NOT use overly formal or corporate language

Response:`;

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        const result = await model.generateContent(prompt);
        const response = result.response.text();

        return NextResponse.json({ suggestedReply: response.trim() });
    } catch (error) {
        console.error('Error generating AI reply:', error);
        return NextResponse.json(
            { error: 'Failed to generate AI response' },
            { status: 500 }
        );
    }
}
