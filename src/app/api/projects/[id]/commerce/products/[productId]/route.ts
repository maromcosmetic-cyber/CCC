import { NextRequest, NextResponse } from 'next/server';
import { getWooCommerceClient } from '@/lib/woocommerce';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string; productId: string } }
) {
    try {
        const auth = await requireAuth(request);
        if (auth.response) return auth.response;

        const woo = await getWooCommerceClient(params.id);
        const { data } = await woo.get(`products/${params.productId}`);

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch product' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string; productId: string } }
) {
    try {
        const auth = await requireAuth(request);
        if (auth.response) return auth.response;

        const woo = await getWooCommerceClient(params.id);
        const body = await request.json();

        const { data } = await woo.put(`products/${params.productId}`, body);

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to update product' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string; productId: string } }
) {
    try {
        const auth = await requireAuth(request);
        if (auth.response) return auth.response;

        const woo = await getWooCommerceClient(params.id);

        // force: true to permanently delete
        const { data } = await woo.delete(`products/${params.productId}`, { force: true });

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to delete product' },
            { status: 500 }
        );
    }
}
