
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://psswhtcpjenmbztlbilo.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzc3dodGNwamVubWJ6dGxiaWxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ4OTMyOCwiZXhwIjoyMDg0MDY1MzI4fQ.0v9qQHBoKSR195m-0m7seIKbVIHq2CVR_yCg82XLXU4";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log("Fetching one product to check columns...");
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .limit(1)
        .single();

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log("Product Keys:", Object.keys(data));
}

main();
