
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

async function checkAndCreateBuckets() {
    const bucketsToEnsure = [
        'scraped-content',
        'media-assets',
        'generated-assets',
        'ugc-videos',
        'company-profile-artifacts',
        'media'
    ];

    console.log('Checking buckets...');
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
        console.error('Error listing buckets:', error);
        return;
    }

    const existingBuckets = buckets.map(b => b.id);
    console.log('Existing buckets:', existingBuckets);

    for (const bucketName of bucketsToEnsure) {
        if (!existingBuckets.includes(bucketName)) {
            console.log(`Creating bucket: ${bucketName}`);
            const { error: createError } = await supabase.storage.createBucket(bucketName, {
                public: true, // Making them public for simplicity in this dev environment
            });
            if (createError) {
                console.error(`Error creating ${bucketName}:`, createError);
            } else {
                console.log(`Bucket ${bucketName} created successfully.`);
            }
        } else {
            console.log(`Bucket ${bucketName} already exists. Ensuring it's public...`);
            const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
                public: true
            });
            if (updateError) {
                console.error(`Error updating ${bucketName}:`, updateError);
            }
        }
    }
}

checkAndCreateBuckets();
