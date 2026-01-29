
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://psswhtcpjenmbztlbilo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzc3dodGNwamVubWJ6dGxiaWxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ4OTMyOCwiZXhwIjoyMDg0MDY1MzI4fQ.0v9qQHBoKSR195m-0m7seIKbVIHq2CVR_yCg82XLXU4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testProductUpdate() {
    const productId = 'fb79cf25-b514-4c30-8798-6917aa9603e3'; // Conditioner
    const newDesc = 'Restore Vitality. Strengthen from Within. Balance Naturally. (TEST SYNC OK)';

    console.log(`Updating product ${productId}...`);
    const { error } = await supabase
        .from('products')
        .update({ description: newDesc })
        .eq('id', productId);

    if (error) {
        console.error('Update error:', error);
    } else {
        console.log('Update successful!');
    }
}

testProductUpdate();
