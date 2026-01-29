
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Checking api_keys table...");
    const { data, error } = await supabase.from('api_keys').select('*');
    if (error) {
        console.error("Error fetching api_keys:", error);
    } else {
        console.log("Found keys:", data.length);
        data.forEach(key => {
            console.log(`- ID: ${key.id}, Key: ${key.consumer_key}, Secret: ${key.consumer_secret}`);
        });
    }
}

main();
