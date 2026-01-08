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

        // Parse query params to forward to Woo
        const searchParams = request.nextUrl.searchParams;
        const page = searchParams.get('page') || '1';
        const per_page = searchParams.get('per_page') || '20';
        const search = searchParams.get('search') || '';

        const { data } = await woo.get('products', {
            page: parseInt(page),
            per_page: parseInt(per_page),
            search: search
        });

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('WooCommerce API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch products' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireAuth(request);
        if (auth.response) return auth.response;

        const woo = await getWooCommerceClient(params.id);
        const body = await request.json();

        const { data } = await woo.post('products', body);

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('WooCommerce API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create product' },
            { status: 500 }
        );
    }
}
