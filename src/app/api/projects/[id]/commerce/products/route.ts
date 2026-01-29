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
        // console.log(`[API] Checking products for Project: ${params.id}`);

        const woo = await getWooCommerceClient(params.id);

        // Parse query params to forward to Woo
        const searchParams = request.nextUrl.searchParams;
        const page = searchParams.get('page') || '1';
        const per_page = searchParams.get('per_page') || '20';
        const search = searchParams.get('search') || '';

        const queryParams: any = {
            // page: parseInt(page),
            // per_page: parseInt(per_page)
        };

        if (search) {
            queryParams.search = search;
        }

        const { data } = await woo.get('products', queryParams);

        console.log(`[API] Fetched ${data?.length} products`);
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('WooCommerce API Error:', error);

        let errorMessage = error.message || 'Failed to fetch products';
        let status = 500;

        if (errorMessage.includes('redirects exceeded')) {
            errorMessage = 'Connection failed: The URL is causing too many redirects. Please check if your Store URL is correct (try adding or removing https:// or www).';
            status = 400;
        }

        return NextResponse.json(
            { error: errorMessage },
            { status: status }
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
