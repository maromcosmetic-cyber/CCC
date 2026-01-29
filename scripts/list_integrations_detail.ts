
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vryuzsnranpemohjipmw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyeXV6c25yYW5wZW1vaGppcG13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk4NDc3OSwiZXhwIjoyMDgyNTYwNzc5fQ.flh0wWtJjgVo99JNQYJleSpIpVsbMtkpbi9_7gqmqd0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listIntegrationsDetail() {
    const { data, error } = await supabase
        .from('integrations')
        .select('*');

    if (error) {
        console.error(error);
        return;
    }

    console.log('Integrations Detail:');
    data.forEach(i => {
        console.log(`ID: ${i.id}, Project: ${i.project_id}, Type: ${i.provider_type}, Config: ${JSON.stringify(i.config)}`);
    });
}

listIntegrationsDetail();
