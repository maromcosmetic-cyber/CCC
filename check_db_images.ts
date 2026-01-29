
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkImages() {
    console.log("Checking media_assets...");

    // 1. Get all unique project_ids
    const { data: projects, error: pError } = await supabase.from('projects').select('id, name').limit(5);
    if (pError) console.error("Project Error:", pError);
    console.log("Projects:", projects?.map(p => ({ id: p.id, name: p.name })));

    if (!projects || projects.length === 0) return;
    const projectId = projects[0].id; // Assuming first project for now

    // 2. Get audiences for this project
    const { data: audiences, error: aError } = await supabase.from('audience_segments').select('id, name').eq('project_id', projectId);
    if (aError) console.error("Audience Error:", aError);
    console.log("Audiences:", audiences);

    // 3. Get media assets dump for this project
    const { data: assets, error: mError } = await supabase
        .from('media_assets')
        .select('id, audience_id, persona_name, image_type, approved, created_at')
        .eq('project_id', projectId)
        .limit(20);

    if (mError) console.error("Media Error:", mError);

    console.log("\n--- Media Assets Sample (Top 20) ---");
    console.table(assets);

    // 4. Check strict query simulation
    if (audiences && audiences.length > 0) {
        const aud = audiences[0];
        console.log(`\n--- Simulating Query for Audience: ${aud.name} (${aud.id}) ---`);

        const { data: strictMatch, error: sError } = await supabase
            .from('media_assets')
            .select('id')
            .eq('project_id', projectId)
            .eq('audience_id', aud.id)
            .eq('persona_name', aud.name);

        console.log(`Strict Match Count (audience_id + persona_name='${aud.name}'):`, strictMatch?.length);
        if (sError) console.log("Strict Query Error:", sError.message);

        // Check relaxed query
        const { data: relaxedMatch } = await supabase
            .from('media_assets')
            .select('id')
            .eq('project_id', projectId)
            .eq('audience_id', aud.id);

        console.log(`Relaxed Match Count (audience_id only):`, relaxedMatch?.length);
    }
}

checkImages();
