
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

async function checkMediaAssets() {
    console.log('Querying media_assets...');
    const { data: assets, error } = await supabase
        .from('media_assets')
        .select('storage_url, storage_bucket')
        .limit(10);

    if (error) {
        console.error('Error querying media_assets:', error);
        return;
    }

    console.log('Sample assets:');
    assets.forEach(a => {
        console.log(`Bucket: ${a.storage_bucket}, URL: ${a.storage_url}`);
    });
}

checkMediaAssets();
