
import { NextRequest, NextResponse } from 'next/server';
import { getWooCommerceClient } from '@/lib/woocommerce';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireAuth(request);
        if (auth.response) return auth.response;

        const woo = await getWooCommerceClient(params.id);
        const { searchParams } = new URL(request.url);

        const page = parseInt(searchParams.get('page') || '1');
        const per_page = parseInt(searchParams.get('per_page') || '20');

        // Fetch Categories
        const { data: categories } = await woo.get('products/categories', {
            page,
            per_page,
            orderby: 'count', // Order by number of products
            order: 'desc',
            hide_empty: true  // Optional: hide empty categories
        });

        // Fetch total count (WooCommerce returns it in header usually, or we just trust the array if < per_page)
        // Note: WooCommerce Node library returns { data, headers }

        return NextResponse.json({
            categories: categories.map((c: any) => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
                count: c.count,
                description: c.description,
                image: c.image?.src || null, // Image URL
                link: c.permalink
            }))
        });

    } catch (error: any) {
        console.error('WooCommerce Collections Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch collections' },
            { status: 500 }
        );
    }
}
