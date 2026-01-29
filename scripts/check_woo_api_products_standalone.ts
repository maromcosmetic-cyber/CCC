
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";

const credentials = {
    "store_url": "http://localhost:10000",
    "consumer_key": "ck_test_12345",
    "consumer_secret": "cs_test_67890",
    "api_version": "wc/v3"
};

const woo = new WooCommerceRestApi({
    url: credentials.store_url,
    consumerKey: credentials.consumer_key,
    consumerSecret: credentials.consumer_secret,
    version: credentials.api_version as any,
    queryStringAuth: false,
    axiosConfig: {
        headers: {
            "Content-Type": "application/json;charset=UTF-8",
            "Authorization": `Basic ${Buffer.from(credentials.consumer_key + ":" + credentials.consumer_secret).toString('base64')}`
        }
    }
});

async function checkApiProducts() {
    try {
        const { data } = await woo.get('products');

        console.log(`Fetched ${data.length} products:`);
        data.forEach((p: any) => {
            console.log(`- ID: ${p.id}, Name: ${p.name}, Slug: ${p.slug}`);
            console.log(`  Desc: ${p.description.substring(0, 100)}...`);
            console.log(`  Source ID in Response: ${p.source_id}`);
        });
    } catch (err: any) {
        console.error(err.response?.data || err.message);
    }
}

checkApiProducts();
