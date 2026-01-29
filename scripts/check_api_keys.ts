
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://psswhtcpjenmbztlbilo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzc3dodGNwamVubWJ6dGxiaWxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ4OTMyOCwiZXhwIjoyMDg0MDY1MzI4fQ.0v9qQHBoKSR195m-0m7seIKbVIHq2CVR_yCg82XLXU4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkApiKeys() {
    console.log('Checking api_keys in psswht...');
    const { data, error } = await supabase
        .from('api_keys')
        .select('*');

    if (error) {
        console.error('Error fetching api_keys:', error);
        return;
    }

    console.log(`Found ${data.length} keys:`);
    data.forEach(k => {
        console.log(`- ID: ${k.id}, Key: ${k.consumer_key}`);
        console.log(`  Secret: ${k.consumer_secret}`);
    });
}

checkApiKeys();
