
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://psswhtcpjenmbztlbilo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzc3dodGNwamVubWJ6dGxiaWxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ4OTMyOCwiZXhwIjoyMDg0MDY1MzI4fQ.0v9qQHBoKSR195m-0m7seIKbVIHq2CVR_yCg82XLXU4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProductSlugs() {
    console.log('Querying slugs from psswht...');
    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, slug')

    if (error) {
        console.error('Error querying products:', error);
        return;
    }

    console.log('DB product slugs:');
    products.forEach(p => {
        console.log(`${p.name}: ${p.slug}`);
    });
}

checkProductSlugs();
