
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIntegrations() {
    const { data: projects, error: pError } = await supabase.from('projects').select('id, name');
    if (pError) {
        console.error('Error fetching projects:', pError);
        return;
    }

    console.log('Projects found:', projects.length);
    for (const project of projects) {
        console.log(`\nProject: ${project.name} (${project.id})`);
        const { data: integrations, error: iError } = await supabase
            .from('integrations')
            .select('*')
            .eq('project_id', project.id);

        if (iError) {
            console.error(`Error fetching integrations for project ${project.id}:`, iError);
            continue;
        }

        if (integrations.length === 0) {
            console.log('  No integrations found.');
        } else {
            for (const integration of integrations) {
                console.log(`  - Platform: ${integration.provider_type}, Status: ${integration.status}`);
            }
        }
    }
}

checkIntegrations();
