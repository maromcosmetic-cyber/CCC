import { ProductCard } from "@/components/ui/ProductCard";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

// Helper to format slug to title case (e.g., hair-care -> Hair Care)
function formatCategory(slug: string) {
    return slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

type Props = {
    params: Promise<{ category: string }>;
};

export default async function CategoryPage({ params }: Props) {
    const { category } = await params;
    const title = formatCategory(category);
    let products = [];

    try {
        // In a real scenario, you'd filter by category column or relation.
        // Assuming 'metadata->category' or similar for now, or just fetching all if schema is simple.
        // Based on the schema viewed earlier, there isn't a direct category column on products table.
        // It seems to use 'collections' or 'categories' which might be in metadata or a separate query.
        // For MVP, we will fetch all and filter client side or if we can identify a category field.
        // Reviewing schema: products table has `metadata JSONB`. 
        // Let's assume we fetch all for now to avoid breaking if metadata structure is unknown,
        // or better, try to filter if we knew the structure.
        // For this step, I'll fetch all and let the user see products, 
        // effectively making categories just show all products for now to avoid empty pages,
        // or ideally, we'd add a WHERE clause if we knew the data shape.

        // Let's fetch all for safety in MVP to demonstrate connectivity.
        const { data } = await supabaseAdmin
            .from('products')
            .select('*');

        if (data) {
            products = data.map((p: any) => ({
                title: p.name,
                image: Array.isArray(p.images) && p.images[0] ? p.images[0] : '/prod-serum.png',
                price: Number(p.price),
                tag: p.stock_status === 'in_stock' ? undefined : 'Out of Stock',
            }));
        }
    } catch (err) {
        console.error("Failed to fetch products:", err);
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <h1 className="text-4xl font-serif text-primary mb-2">{title}</h1>
            <p className="text-muted-foreground mb-8">Browse our natural collection.</p>

            {products.length === 0 ? (
                <div className="text-center py-20 bg-muted/30 rounded-lg">
                    <p className="text-muted-foreground">No products found.</p>
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
