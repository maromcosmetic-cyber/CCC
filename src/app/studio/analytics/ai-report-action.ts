'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getClarityInsights } from './actions';

// Check multiple possible environment variable names for the API key
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_TTS_KEY || process.env.KIE_AI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export interface AIAnalyticsReport {
  summary: string;
  keyFindings: Array<{
    title: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  recommendations: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  generatedAt: string;
}

export async function generateAIAnalyticsReport(projectId: string): Promise<AIAnalyticsReport | null> {
  try {
    // Fetch Clarity data
    const clarityData = await getClarityInsights(projectId);

    if (!clarityData) {
      return null;
    }

    // Prepare the prompt for AI analysis
    const prompt = `You are an expert web analytics consultant. Analyze the following website behavior data from Microsoft Clarity and provide actionable insights.

**Website Analytics Data:**
- Active Users (last 3 days): ${clarityData.sessionsCount}
- Pages per Session: ${clarityData.pagesPerSession?.toFixed(1) || 'N/A'}
- Average Scroll Depth: ${clarityData.scrollDepth?.toFixed(0) || 'N/A'}%
- Bounce Rate: ${clarityData.bounceRate?.toFixed(1) || 'N/A'}%
- Average Time on Site: ${clarityData.timeOnSite ? Math.floor(clarityData.timeOnSite / 60) : 'N/A'} minutes

**Your Task:**
1. Provide a brief executive summary (2-3 sentences) of the overall website performance.
2. Identify 3-5 key findings with severity levels (high/medium/low).
3. Provide 3-5 actionable recommendations with priority levels (high/medium/low).

**Output Format (JSON):**
{
  "summary": "Executive summary here",
  "keyFindings": [
    {
      "title": "Finding title",
      "description": "Detailed description",
      "severity": "high|medium|low"
    }
  ],
  "recommendations": [
    {
      "title": "Recommendation title",
      "description": "Detailed actionable steps",
      "priority": "high|medium|low"
    }
  ]
}

Focus on practical, data-driven insights. Be specific about what the metrics indicate and what actions should be taken.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = response.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const analysis = JSON.parse(jsonText);

    return {
      summary: analysis.summary,
      keyFindings: analysis.keyFindings || [],
      recommendations: analysis.recommendations || [],
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error generating AI analytics report:', error);
    return null;
  }
}
