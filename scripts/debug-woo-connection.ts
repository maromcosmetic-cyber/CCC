
import 'dotenv/config';
import { getWooCommerceClient } from '../src/lib/woocommerce';
import { getIntegrationCredentials } from '../src/lib/integrations/manager';

const PROJECT_ID = 'b913e42d-2ef2-4658-a613-b7d7bbe3b401';

async function main() {
    console.log("Debugging WooCommerce Connection...");

    try {
        const credentials = await getIntegrationCredentials(PROJECT_ID, 'woocommerce');
        console.log("Credentials found:", credentials ? "Yes" : "No");
        if (credentials) {
            console.log("Store URL:", credentials.store_url);
            console.log("API Version:", credentials.api_version);
        }

        const woo = await getWooCommerceClient(PROJECT_ID);
        // FORCE OVERRIDE CREDENTIALS FOR TESTING
        (woo as any).consumerKey = 'ck_test_12345';
        (woo as any).consumerSecret = 'cs_test_67890';

        // Access the internal client to see configuration
        const client = woo as any;
        console.log("WooCommerce Client Config:");
        console.log("- URL:", client.url);
        console.log("- Version:", client.version);
        console.log("- Is SSL:", client.isSsl);
        console.log("- Verify SSL:", client.verifySsl);

        console.log("\nAttempting to fetch products with pagination only...");
        const response = await woo.get("products", {
            page: 1,
            per_page: 20
        });
        console.log(`Success! Fetched ${response.data.length} products.`);
    } catch (error: any) {
        console.error("\nConnection Failed!");
        console.error("Error Message:", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("URL:", error.response.config?.url);
            console.error("Base URL:", error.response.config?.baseURL);
        }
    }
}

main();
