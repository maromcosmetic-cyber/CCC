
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://psswhtcpjenmbztlbilo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzc3dodGNwamVubWJ6dGxiaWxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ4OTMyOCwiZXhwIjoyMDg0MDY1MzI4fQ.0v9qQHBoKSR195m-0m7seIKbVIHq2CVR_yCg82XLXU4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProjectsInNew() {
    console.log('Checking projects in psswht...');
    const { data: projects, error } = await supabase
        .from('projects')
        .select('id, name');

    if (error) {
        console.error('Error fetching projects:', error);
        return;
    }

    console.log(`Found ${projects.length} projects:`);
    projects.forEach(p => {
        console.log(`- ${p.name} (ID: ${p.id})`);
    });
}

checkProjectsInNew();
