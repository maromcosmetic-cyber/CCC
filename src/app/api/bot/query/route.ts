// Bot query API (customer service)

import { NextRequest, NextResponse } from 'next/server';
import { supabaseBot } from '@/lib/db/client';
import { BotQuerySchema } from '@/lib/validation/schemas';
import { KieAIProvider } from '@/lib/providers/kie/KieAIProvider';
import { logAuditEvent } from '@/lib/audit/logger';
import { SupabaseStorage } from '@/lib/providers/supabase/SupabaseStorage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = BotQuerySchema.parse(body);

    const { query, project_id } = validated;

    if (!supabaseBot) {
      return NextResponse.json({ error: 'Bot service not available' }, { status: 500 });
    }

    // Retrieve relevant context from Supabase Storage and database
    const contextParts: string[] = [];

    // Get company profile
    const { data: companyProfile } = await supabaseBot
      .from('company_profiles')
      .select('*')
      .eq('project_id', project_id)
      .not('locked_at', 'is', null)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (companyProfile) {
      contextParts.push(`Company Profile: ${JSON.stringify(companyProfile.profile_data, null, 2)}`);
    }

    // Get scraped content from storage
    const storage = new SupabaseStorage();
    try {
      const files = await storage.listFiles('scraped-content', project_id);
      // In real implementation, read and extract relevant content from files
      contextParts.push(`Scraped content available: ${files.length} files`);
    } catch (error) {
      // Continue without scraped content if unavailable
    }

    // Get products
    const { data: products } = await supabaseBot
      .from('products')
      .select('name, description, price')
      .eq('project_id', project_id)
      .limit(10);

    if (products && products.length > 0) {
      contextParts.push(`Products: ${JSON.stringify(products, null, 2)}`);
    }

    // Build prompt for LLM
    const prompt = `You are a customer service assistant for this company. Answer the customer's question based on the following context.

Context:
${contextParts.join('\n\n')}

Customer Question: ${query}

Instructions:
- Answer accurately based on the provided context
- If information is not in the context, say "I don't have that information, but I can help you with..."
- Be helpful and professional
- Include evidence references when possible

Answer:`;

    // LLM is platform-managed - uses Kie AI unified gateway
    const llm = new KieAIProvider();
    const response = await llm.generate(prompt);

    // Extract evidence references from context
    const evidenceRefs = companyProfile
      ? [
          {
            source_url: 'company_profile',
            snippet: 'Company profile data',
          },
        ]
      : [];

    await logAuditEvent({
      event_type: 'bot_query',
      actor_type: 'whatsapp',
      source: 'whatsapp',
      project_id,
      payload: {
        query,
        answer_length: response.content.length,
      },
    });

    return NextResponse.json({
      answer: response.content,
      evidence_refs: evidenceRefs,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

