
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { encryptCredentials } from '../src/lib/encryption/credentials';

// CCC Credentials
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PROJECT_ID = 'b913e42d-2ef2-4658-a613-b7d7bbe3b401';

async function main() {
    console.log("Forcing update of WooCommerce Integration record...");

    // These are the credentials we know work
    const config = {
        store_url: 'http://localhost:10000',
        consumer_key: 'ck_test_12345',
        consumer_secret: 'cs_test_67890',
        api_version: 'wc/v3'
    };

    // 1. Get existing integration to find ID
    const { data: existing, error: fetchError } = await supabase
        .from('integrations')
        .select('*')
        .eq('project_id', PROJECT_ID)
        .eq('provider_type', 'woocommerce')
        .single();

    if (!existing) {
        console.error("Integration not found!");
        return;
    }

    console.log("Found integration:", existing.id);

    // 2. Encrypt credentials
    const encrypted = encryptCredentials(config);

    // 3. Update the record
    const { error: updateError } = await supabase
        .from('integrations')
        .update({
            credentials_encrypted: encrypted,
            config: {
                store_url: config.store_url,
                consumer_key: config.consumer_key,
                api_version: config.api_version
            },
            status: 'active',
            updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

    if (updateError) {
        console.error("Error updating:", updateError);
    } else {
        console.log("Successfully updated integration record with encrypted credentials.");
    }
}

main();
