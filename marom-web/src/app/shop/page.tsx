import { ProductCard } from "@/components/ui/ProductCard";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export default async function ShopPage() {
    let products = [];

    console.log("Fetching products from Supabase...");

    try {
        // Add a timeout to prevent hanging
        const fetchPromise = supabaseAdmin
            .from('products')
            .select('*', { count: 'exact' })
            .limit(12);

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Supabase request timed out')), 5000)
        );

        const { data, error, count } = await Promise.race([fetchPromise, timeoutPromise]) as any;

        if (error) {
            console.error("Supabase Error:", error);
        } else {
            console.log(`Supabase Success: Found ${data?.length} products.`);
        }

        if (data) {
            products = data.map((p: any) => {
                // Handle image structure: string, array of strings, or array of objects with url
                let imageUrl = '/prod-serum.png';
                if (Array.isArray(p.images) && p.images.length > 0) {
                    const firstImg = p.images[0];
                    if (typeof firstImg === 'string') {
                        imageUrl = firstImg;
                    } else if (typeof firstImg === 'object' && firstImg.url) {
                        imageUrl = firstImg.url;
                    }
                }

                return {
                    title: p.name,
                    image: imageUrl,
                    price: Number(p.price),
                    tag: p.stock_status === 'in_stock' ? undefined : 'Out of Stock',
                };
            });
        }
    } catch (err) {
        console.error("Failed to fetch products:", err);
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <h1 className="text-4xl font-serif text-primary mb-8">All Products</h1>

            {products.length === 0 ? (
                <div className="text-center py-20 bg-muted/30 rounded-lg">
                    <p className="text-muted-foreground">No products found in the catalog.</p>
                    <p className="text-xs text-muted-foreground mt-4">Debug: Check server console for details.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                    {products.map((product, index) => (
                        <ProductCard key={index} {...product} />
                    ))}
                </div>
            )}
        </div>
    );
}
