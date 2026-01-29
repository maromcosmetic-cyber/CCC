
import { getWooCommerceClient } from '@/lib/woocommerce';

async function checkApiProducts() {
    const projectId = 'b913e42d-2ef2-4658-a613-b7d7bbe3b401';
    try {
        const woo = await getWooCommerceClient(projectId);
        const { data } = await woo.get('products');

        console.log(`Fetched ${data.length} products:`);
        data.slice(0, 5).forEach(p => {
            console.log(`- ID: ${p.id}, Name: ${p.name}, Slug: ${p.slug}`);
        });
    } catch (err: any) {
        console.error(err);
    }
}

// Since getWooCommerceClient is an export from a TS file in src, 
// and it uses relative imports, I might need to run it within the project context.
// I'll create a standalone script that duplicates the logic if needed.
