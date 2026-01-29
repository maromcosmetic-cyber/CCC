
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vryuzubznhfpxvgyatfy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyeXV6dWJ6bmhmcHh2Z3lhdGZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ4OTMzMCwiZXhwIjoyMDg0MDY1MzMwfQ.96o1r5T0i1-W05eicY5O-gAIB2m-EaH8bQyH7U8u-Lg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixConditionerSlug() {
    console.log('Fixing conditioner slug in CCC local database...');

    // 1. Fix the double space in the name and ensure slug is exactly 'moringa-keratin-conditioner'
    const { data: updateData, error: updateError } = await supabase
        .from('products')
        .update({
            name: "Moringa & Keratin Conditioner",
            slug: "moringa-keratin-conditioner"
        })
        .eq('slug', 'moringa-keratin--conditioner');

    if (updateError) {
        // Also try by the one with the double space if the slug didn't match
        const { error: error2 } = await supabase
            .from('products')
            .update({
                name: "Moringa & Keratin Conditioner",
                slug: "moringa-keratin-conditioner"
            })
            .ilike('name', 'Moringa & Keratin%Conditioner');

        if (error2) {
            console.error('Fix Failed:', error2);
            return;
        }
    }

    console.log('Successfully updated conditioner record in CCC local DB.');

    // 2. Refresh listed products to confirm
    const { data: products } = await supabase
        .from('products')
        .select('id, name, slug');

    console.log('Current CCC Products:');
    products?.forEach(p => console.log(`- ${p.name} (${p.slug})`));
}

fixConditionerSlug();
