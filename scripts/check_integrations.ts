
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vryuzsnranpemohjipmw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyeXV6c25yYW5wZW1vaGppcG13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk4NDc3OSwiZXhwIjoyMDgyNTYwNzc5fQ.flh0wWtJjgVo99JNQYJleSpIpVsbMtkpbi9_7gqmqd0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIntegrations() {
    console.log('Checking integrations in vryuz...');
    const { data, error } = await supabase
        .from('integrations')
        .select('*');

    if (error) {
        console.error('Error fetching integrations:', error);
        return;
    }

    console.log(`Found ${data.length} integrations:`);
    data.forEach(i => {
        console.log(`- Type: ${i.type}, Name: ${i.name}`);
        console.log(`  Config: ${JSON.stringify(i.config, null, 2)}`);
    });
}

checkIntegrations();
