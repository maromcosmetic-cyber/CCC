
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentImages() {
    console.log("Checking recent media_assets...");

    const { data: assets, error } = await supabase
        .from('media_assets')
        .select('id, storage_bucket, storage_path, created_at, image_type')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching assets:", error);
        return;
    }

    console.table(assets);

    if (assets && assets.length > 0) {
        const asset = assets[0];
        console.log("\nTop Asset Details:");
        console.log("Bucket:", asset.storage_bucket);
        console.log("Path:", asset.storage_path);

        // Test Signing URL
        const bucket = asset.storage_bucket || 'generated-assets';
        const path = asset.storage_path;
        console.log(`\nTesting Signed URL for bucket='${bucket}' path='${path}'...`);

        const { data: signedData, error: signError } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, 60);

        if (signError) {
            console.error("Signed URL Error:", signError.message);
        } else {
            console.log("Signed URL generated successfully (valid for 60s):");
            console.log(signedData?.signedUrl.substring(0, 100) + "...");
        }
    }
}

checkRecentImages();
