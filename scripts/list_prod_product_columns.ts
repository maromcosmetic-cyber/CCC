
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://psswhtcpjenmbztlbilo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzc3dodGNwamVubWJ6dGxiaWxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ4OTMyOCwiZXhwIjoyMDg0MDY1MzI4fQ.0v9qQHBoKSR195m-0m7seIKbVIHq2CVR_yCg82XLXU4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listColumns() {
    console.log('Listing columns for products in psswht...');
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .limit(1);

    if (error) {
        console.error(error);
        return;
    }

    console.log('Columns:', Object.keys(data[0] || {}));
    console.log('Sample Data:', data[0]);
}

listColumns();
