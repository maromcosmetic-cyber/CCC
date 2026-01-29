
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentAssets() {
    console.log('🔍 Checking recent media assets (limit 5)...');

    // Explicitly select columns to verify they exist and have data
    const { data: assets, error } = await supabase
        .from('media_assets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('❌ Error fetching assets:', error);
        return;
    }

    if (!assets || assets.length === 0) {
        console.log('⚠️ No media assets found.');
        return;
    }

    console.log(`✅ Found ${assets.length} assets. Inspecting fields:`);
    assets.forEach((asset, i) => {
        console.log(`\n--- Asset #${i + 1} (${asset.id}) ---`);
        console.log('Created At:', asset.created_at);
        console.log('Bucket:', asset.storage_bucket);
        console.log('Path:', asset.storage_path);
        console.log('Metadata:', asset.metadata ? JSON.stringify(asset.metadata).slice(0, 100) + '...' : 'NULL');
        console.log('Product IDs:', asset.product_ids);
        console.log('Image Type:', asset.image_type);
        console.log('File Size:', asset.file_size);
    });
}

checkRecentAssets();
