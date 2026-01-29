
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vryuzsnranpemohjipmw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyeXV6c25yYW5wZW1vaGppcG13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk4NDc3OSwiZXhwIjoyMDgyNTYwNzc5fQ.flh0wWtJjgVo99JNQYJleSpIpVsbMtkpbi9_7gqmqd0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCccProducts() {
    console.log('Checking products in CCC DB (vryuz)...');
    const { data, error } = await supabase
        .from('products')
        .select('id, name, source_id, slug')
        .limit(5);

    if (error) {
        console.error(error);
        return;
    }

    console.log('CCC Products:');
    data.forEach(p => {
        console.log(`- ID: ${p.id}, source_id: ${p.source_id}, Name: ${p.name}, Slug: ${p.slug}`);
    });
}

checkCccProducts();
