
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { WooCommerceApi } from '../src/lib/providers/woocommerce/WooCommerceApi';
import { decryptCredentials } from '../src/lib/encryption/credentials';

// Load env vars from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const encryptionKey = process.env.CREDENTIALS_ENCRYPTION_KEY;

if (!supabaseUrl || !supabaseKey || !encryptionKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('--- WooCommerce Sync Test ---');

    // 1. Get the first project with WooCommerce integration
    const { data: integrations, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('provider_type', 'woocommerce')
        .limit(1);

    if (error) {
        console.error('Error fetching integrations:', error);
        return;
    }

    if (!integrations || integrations.length === 0) {
        console.error('No WooCommerce integration found in database.');
        return;
    }

    const integration = integrations[0];
    console.log(`Found integration for project: ${integration.project_id}`);

    // 2. Decrypt credentials manually since we are outside the app context/manager
    // We need to ensure we use the same decryption logic
    let credentials;
    try {
        // decryptCredentials uses process.env.CREDENTIALS_ENCRYPTION_KEY
        // which we loaded via dotenv
        credentials = decryptCredentials(integration.credentials_encrypted);
    } catch (e) {
        console.error('Failed to decrypt credentials:', e);
        return;
    }

    if (!credentials) {
        console.error('Decrypted credentials are null');
        return;
    }

    console.log('Credentials decrypted successfully.');
    console.log(`Store URL: ${credentials.store_url}`);

    // 3. Initialize WooCommerce API
    const woo = new WooCommerceApi(credentials as any);

    // 4. Fetch Products
    console.log('Fetching products (default sync)...');
    try {
        const products = await woo.syncProducts(credentials.store_url as string, credentials);
        console.log(`\nSuccess! Fetched ${products.length} products.`);

        if (products.length === 50) {
            console.log('WARNING: Exactly 50 products fetched. This likely indicates pagination is missing.');
        } else if (products.length > 50) {
            console.log('SUCCESS: More than 50 products fetched. Pagination is working (or total < 50 but coincidentally).');
        } else {
            console.log('fetched less than 50 products.');
        }

    } catch (e: any) {
        console.error('Sync failed:', e.message);
    }
}

main();
