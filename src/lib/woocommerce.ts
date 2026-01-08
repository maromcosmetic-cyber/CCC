import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import { getIntegrationCredentials } from "./integrations/manager";

export async function getWooCommerceClient(projectId: string) {
    try {
        const credentials = await getIntegrationCredentials(projectId, 'woocommerce');

        if (!credentials || !credentials.store_url || !credentials.consumer_key || !credentials.consumer_secret) {
            throw new Error("WooCommerce integration not configured for this project");
        }

        // Ensure valid URL
        let url = String(credentials.store_url);
        if (!url.startsWith('http')) {
            url = `https://${url}`;
        }

        return new WooCommerceRestApi({
            url: url,
            consumerKey: String(credentials.consumer_key),
            consumerSecret: String(credentials.consumer_secret),
            version: "wc/v3"
        });
    } catch (error: any) {
        console.error("WooCommerce client factory error:", error);
        // Return a standard error that the UI expects for "not configured"
        // AND capture the "string pattern" error if it happens during decryption
        throw new Error("WooCommerce integration not configured properly (" + (error.message || error) + ")");
    }
}
