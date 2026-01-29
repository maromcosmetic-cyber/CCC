
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vryuzsnranpemohjipmw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyeXV6c25yYW5wZW1vaGppcG13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk4NDc3OSwiZXhwIjoyMDgyNTYwNzc5fQ.flh0wWtJjgVo99JNQYJleSpIpVsbMtkpbi9_7gqmqd0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOldProjectsIdentity() {
    console.log('Checking projects identity in vryuz...');
    const { data: projects, error } = await supabase
        .from('projects')
        .select('id, name, slug, settings, strategy_guide, company_profile');

    if (error) {
        console.error('Error fetching projects:', error);
        return;
    }

    console.log(`Found ${projects.length} projects in old DB:`);
    projects.forEach(p => {
        console.log(`ID: ${p.id}, Name: ${p.name}, Slug: ${p.slug}`);
        // We'll migrate everything
    });
}

checkOldProjectsIdentity();
