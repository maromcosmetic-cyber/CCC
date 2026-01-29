
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('Testing connection to Supabase...');

    try {
        // 1. List Projects with User IDs
        console.log('\n--- PROJECTS (Top 10) ---');
        const { data: projects, error: projectsError } = await supabase.from('projects').select('id, name, user_id').limit(10);
        if (projectsError) {
            console.error('Projects fetch failed:', projectsError);
        } else {
            projects?.forEach(p => console.log(`Project: ${p.id} | Name: "${p.name}" | Owner: ${p.user_id}`));
        }

        // 2. List Media Assets with Project IDs
        console.log('\n--- MEDIA ASSETS (Top 10) ---');
        const { data: media, error: mediaError } = await supabase.from('media_assets').select('id, project_id, storage_path').limit(10);
        if (mediaError) {
            console.error('media_assets fetch failed:', mediaError);
        } else {
            console.log(`Total fetched: ${media?.length}`);
            media?.forEach(m => {
                const parent = projects?.find(p => p.id === m.project_id);
                console.log(`Media: ${m.id} | Project: ${m.project_id} | Path: ${m.storage_path} | Parent Found: ${!!parent}`);
            });
        }

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

testConnection();
