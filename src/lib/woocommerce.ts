import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import { getIntegrationCredentials } from "./integrations/manager";

export async function getWooCommerceClient(projectId: string) {
    try {
        const credentials = await getIntegrationCredentials(projectId, 'woocommerce');

        if (!credentials || !credentials.store_url || !credentials.consumer_key || !credentials.consumer_secret) {
            throw new Error("WooCommerce integration not configured for this project");
        }

        // Ensure valid URL cleanup
        let url = String(credentials.store_url).trim();
        // Remove trailing slash
        if (url.endsWith('/')) {
            url = url.slice(0, -1);
        }

        // Add protocol if missing
        if (!url.startsWith('http')) {
            if (url.includes('localhost') || url.includes('127.0.0.1')) {
                url = `http://${url}`;
            } else {
                url = `https://${url}`;
            }
        }

        console.log(`[WooCommerce Client] Initializing for: ${url}`);

        return new WooCommerceRestApi({
            url: url,
            consumerKey: String(credentials.consumer_key),
            consumerSecret: String(credentials.consumer_secret),
            version: ((credentials.api_version && String(credentials.api_version).match(/^v\d+$/)
                ? `wc/${credentials.api_version}`
                : credentials.api_version) || "wc/v3") as any,
            timeout: 30000, // 30 seconds timeout
            queryStringAuth: false, // Force Basic Auth header even for HTTP (localhost)
            axiosConfig: {
                timeout: 30000,
                headers: {
                    "Content-Type": "application/json;charset=UTF-8",
                    "Authorization": `Basic ${Buffer.from(credentials.consumer_key + ":" + credentials.consumer_secret).toString('base64')}`
                }
            }
        });
    } catch (error: any) {
        console.error("WooCommerce client factory error:", error);
        // Return a standard error that the UI expects for "not configured"
        // AND capture the "string pattern" error if it happens during decryption
        throw new Error("WooCommerce integration not configured properly (" + (error.message || error) + ")");
    }
}
