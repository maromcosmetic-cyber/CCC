
import { NextRequest, NextResponse } from 'next/server';
import { generatePersona } from '@/lib/ai/persona-generation';
import { requireAuth } from '@/lib/auth/middleware';
import { createServiceRoleClient } from '@/lib/auth/server';

export const maxDuration = 60; // Allow 60s for image gen + text gen

export async function POST(req: NextRequest) {
    try {
        // 1. Auth Check
        const auth = await requireAuth(req);
        if (auth.response) return auth.response;

        // 2. Parse Request
        const { audienceSegment, projectId } = await req.json();

        if (!audienceSegment || !projectId) {
            return NextResponse.json({ error: 'Missing audienceSegment or projectId' }, { status: 400 });
        }

        console.log(`🤖 Generating Persona for Project ${projectId}...`);

        // 3. Generate Persona (Service)
        const result = await generatePersona(audienceSegment, projectId);

        // 4. Persist to DB
        const supabase = createServiceRoleClient();

        const { data: project, error: fetchError } = await supabase
            .from('projects')
            .select('brand_identity')
            .eq('id', projectId)
            .single();

        if (fetchError) throw new Error("Failed to fetch project: " + fetchError.message);

        const currentIdentity = (project as any)?.brand_identity || {};
        const currentPersonas = currentIdentity.personas || {};

        // Key by audience name
        const updatedPersonas = {
            ...currentPersonas,
            [audienceSegment.name]: result
        };

        const updatedIdentity = {
            ...currentIdentity,
            personas: updatedPersonas
        };

        const { error: updateError } = await (supabase as any)
            .from('projects')
            .update({ brand_identity: updatedIdentity })
            .eq('id', projectId);

        if (updateError) throw new Error("Failed to save persona: " + updateError.message);

        return NextResponse.json({ success: true, ...result });

    } catch (error: any) {
        console.error("❌ Persona Generation API Error:", error);
        return NextResponse.json({
            success: false,
            error: error.message || "Failed to generate persona"
        }, { status: 500 });
    }
}
