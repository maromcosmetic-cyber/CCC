
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vryuzsnranpemohjipmw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyeXV6c25yYW5wZW1vaGppcG13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk4NDc3OSwiZXhwIjoyMDgyNTYwNzc5fQ.flh0wWtJjgVo99JNQYJleSpIpVsbMtkpbi9_7gqmqd0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchFullProject() {
    console.log('Fetching full project from vryuz...');
    const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching projects:', error);
        return;
    }

    if (projects.length === 0) {
        console.log('No projects found.');
        return;
    }

    console.log('PROJECT_DATA_START');
    console.log(JSON.stringify(projects[0], null, 2));
    console.log('PROJECT_DATA_END');
}

fetchFullProject();
