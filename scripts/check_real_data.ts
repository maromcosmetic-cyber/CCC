
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://psswhtcpjenmbztlbilo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzc3dodGNwamVubWJ6dGxiaWxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ4OTMyOCwiZXhwIjoyMDg0MDY1MzI4fQ.0v9qQHBoKSR195m-0m7seIKbVIHq2CVR_yCg82XLXU4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRealProductData() {
    console.log('Querying real products from psswht...');
    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, name_he, description, description_he')
        .limit(5);

    if (error) {
        console.error('Error querying products:', error);
        return;
    }

    console.log('Real product descriptions:');
    products.forEach(p => {
        console.log(`--- Product: ${p.name} (${p.id}) ---`);
        console.log(`Name (HE): ${p.name_he}`);
        console.log(`Description (EN): ${p.description?.substring(0, 50)}...`);
        console.log(`Description (HE): ${p.description_he?.substring(0, 50)}...`);
    });
}

checkRealProductData();
