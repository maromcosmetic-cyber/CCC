/**
 * Ad Layout Chat API
 * 
 * Uses Gemini to understand layout change requests and return updated layout JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_TTS_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function POST(request: NextRequest) {
  try {
    const { projectId, template, message, currentLayout, brandGuidelines } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!genAI) {
      return NextResponse.json({ 
        error: 'Gemini API not configured',
        response: 'I understand you want to make changes, but the AI chat feature is not configured. Please configure GEMINI_API_KEY in your environment variables.'
      }, { status: 503 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `
You are an expert ad layout designer. A user wants to modify an ad template layout.

CURRENT LAYOUT:
${JSON.stringify(currentLayout, null, 2)}

USER REQUEST:
"${message}"

TEMPLATE INFO:
- Platform: ${template.platform}
- Type: ${template.template_type}
- Name: ${template.name}

${brandGuidelines ? `BRAND GUIDELINES:\n${JSON.stringify(brandGuidelines, null, 2)}` : ''}

Your task:
1. Understand what the user wants to change
2. Return a JSON object with ONLY the layout properties that need to be changed
3. Keep all other properties unchanged
4. Ensure changes are valid (e.g., positions are within bounds, sizes are reasonable)

Return a JSON object with the layout changes. Example:
{
  "text_zones": [
    {
      "type": "headline",
      "font_size": 36,
      "position": "top"
    }
  ],
  "spacing": {
    "padding": 30
  }
}

Only include properties that need to change. Return valid JSON only, no explanations.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Try to extract JSON from response
    let layoutChanges = null;
    try {
      // Look for JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        layoutChanges = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse layout changes:', e);
    }

    return NextResponse.json({
      response: responseText,
      layoutChanges
    });

  } catch (error: any) {
    console.error('Ad layout chat error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process chat message',
        response: 'I encountered an error processing your request. Please try rephrasing it.'
      },
      { status: 500 }
    );
  }
}
