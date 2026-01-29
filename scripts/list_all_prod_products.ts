
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://psswhtcpjenmbztlbilo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzc3dodGNwamVubWJ6dGxiaWxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ4OTMyOCwiZXhwIjoyMDg0MDY1MzI4fQ.0v9qQHBoKSR195m-0m7seIKbVIHq2CVR_yCg82XLXU4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listProducts() {
    console.log('Listing products in production (psswht)...');
    const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, description');

    if (error) {
        console.error(error);
        return;
    }

    data.forEach(p => {
        console.log(`- ID: ${p.id}`);
        console.log(`  Name: ${p.name}`);
        console.log(`  Slug: ${p.slug}`);
        console.log(`  Desc: ${p.description.substring(0, 50)}...`);
    });
}

listProducts();
