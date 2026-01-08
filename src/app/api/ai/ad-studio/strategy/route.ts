
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { getWooCommerceClient } from '@/lib/woocommerce';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY || process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
    try {
        const { projectId, productId, audience, goal } = await req.json();

        if (!projectId || !productId) {
            return NextResponse.json({ error: 'Missing projectId or productId' }, { status: 400 });
        }

        // 1. Fetch Brand Data (Project)
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (projectError || !project) {
            throw new Error('Project not found');
        }

        const brandIdentity = project.brand_identity || {}; // Assumption
        const brandTone = brandIdentity.tone || "Professional and trustworthy";
        const brandColors = brandIdentity.colors || [];

        // 2. Fetch Product Data (WooCommerce)
        const woo = await getWooCommerceClient(projectId);
        const { data: product } = await woo.get(`products/${productId}`);

        if (!product) {
            throw new Error('Product not found in WooCommerce');
        }

        // Extract key product info
        const productInfo = {
            name: product.name,
            price: product.price,
            description: product.description.replace(/<[^>]*>/g, '').substring(0, 500), // Clean HTML
            short_description: product.short_description.replace(/<[^>]*>/g, ''),
            categories: product.categories.map((c: any) => c.name).join(', '),
            images: product.images.map((i: any) => i.src)
        };

        // 3. Generate Strategy with OpenAI
        const systemPrompt = `
      You are a world-class Ad Strategist and Copywriter.
      Your goal is to create a high-converting "Ad Blueprint" for a specific product, tailored to a brand's identity and a target audience.
      
      Output JSON format:
      {
        "headline": "Main punchy headline (max 10 words)",
        "body_copy": "Persuasive ad body (max 50 words)",
        "hook": "The angle/hook used (e.g. Fear of Missing Out, Problem/Solution)",
        "cta": "Call to action",
        "visual_prompt": "Detailed description for an AI image generator (Flux/Imagen) to create the background or scene. Include lighting, composition, and mood.",
        "design_notes": "Suggestions for layout, colors, and font styles based on brand identity."
      }
    `;

        const userPrompt = `
      PRODUCT:
      Name: ${productInfo.name}
      Price: ${productInfo.price}
      Description: ${productInfo.short_description}
      
      BRAND IDENTITY:
      Tone: ${brandTone}
      
      TARGET AUDIENCE:
      ${audience || 'General audience interested in this product'}
      
      GOAL:
      ${goal || 'Sales Conversion'}
      
      Create the Ad Blueprint.
    `;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o", /* using gpt-4o for best reasoning */
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" }
        });

        const strategy = JSON.parse(completion.choices[0].message.content || '{}');

        return NextResponse.json({
            success: true,
            strategy,
            product: productInfo
        });

    } catch (error: any) {
        console.error('Ad Strategy Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
