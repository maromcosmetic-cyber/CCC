import { ProductCard } from "@/components/ui/ProductCard";
import { supabaseAdmin } from "@/lib/supabase";

// Fallback products if DB is empty
const fallbackProducts = [
    {
        title: "Moringa & Reishi Hair Serum",
        image: "/prod-serum.png",
        price: 249,
        originalPrice: 279,
        tag: "Best Seller"
    },
    {
        title: "Moringa Infusion Shampoo",
        image: "/prod-shampoo.png",
        price: 349,
        tag: "New"
    },
    {
        title: "Moringa & Keratin Conditioner",
        image: "/prod-conditioner.png",
        price: 319,
        originalPrice: 389,
        tag: "Sale"
    },
    {
        title: "Natural Mosquito Repellent",
        image: "/prod-spray.png",
        price: 289,
        tag: "Family Safe"
    }
];

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';

export async function BestSellers() {
    let products = fallbackProducts;

    try {
        // Fetch products from Supabase
        const { data, error } = await supabaseAdmin
            .from('products')
            .select('*')
            .limit(4);

        if (data && data.length > 0) {
            products = data.map((p: any) => {
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
                    tag: p.stock_status === 'in_stock' ? 'In Stock' : undefined,
                    originalPrice: undefined
                };
            });
        }
    } catch (err) {
        console.error("Failed to fetch products:", err);
        // Continue with fallback products
    }

    return (
        <section className="py-20 bg-muted/30">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
                    <div className="text-center md:text-left">
                        <h2 className="text-3xl md:text-4xl font-serif text-primary mb-2">Customer Favorites</h2>
                        <p className="text-muted-foreground">Loved by families, powered by nature.</p>
                    </div>
                    <a href="/shop" className="text-secondary font-medium hover:text-primary transition-colors border-b border-transparent hover:border-primary pb-1">
                        View All Products
                    </a>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                    {products.map((product, index) => (
                        <ProductCard key={index} {...product} />
                    ))}
                </div>
            </div>
        </section>
    );
}
