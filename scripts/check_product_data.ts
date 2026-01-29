
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProductDescriptions() {
    console.log('Querying products for descriptions...');
    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, name_he, description, description_he')
        .limit(5);

    if (error) {
        console.error('Error querying products:', error);
        return;
    }

    console.log('Sample product descriptions:');
    products.forEach(p => {
        console.log(`--- Product: ${p.name} (${p.id}) ---`);
        console.log(`Name (HE): ${p.name_he}`);
        console.log(`Description (EN): ${p.description?.substring(0, 100)}...`);
        console.log(`Description (HE): ${p.description_he?.substring(0, 100)}...`);
    });
}

checkProductDescriptions();
