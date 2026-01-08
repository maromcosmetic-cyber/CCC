
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

        // Fetch Coupons
        const { data: coupons } = await woo.get('coupons', {
            page,
            per_page
        });

        return NextResponse.json({
            coupons: coupons.map((c: any) => ({
                id: c.id,
                code: c.code,
                amount: c.amount,
                discount_type: c.discount_type, // 'percent', 'fixed_cart', etc.
                description: c.description,
                date_expires: c.date_expires,
                usage_count: c.usage_count,
                status: 'active' // WooCommerce doesn't have explicit status field in v3 list easily, usually inferred or 'publish'
            }))
        });

    } catch (error: any) {
        console.error('WooCommerce Coupons Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch coupons' },
            { status: 500 }
        );
    }
}
