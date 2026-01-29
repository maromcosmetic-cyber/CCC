import { NextRequest, NextResponse } from 'next/server';
import { getWooCommerceClient } from '@/lib/woocommerce';
import { requireAuth } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/db/client';

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

function slugify(text: string) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
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

        // 1. Get CURRENT product state from WooCommerce to find the valid matching slug
        // We do this BEFORE the update, to make sure we can find the product in Supabase
        // (If we use the NEW name to generate slug, we might not find the old record if name changed)
        const { data: currentWcProduct } = await woo.get(`products/${params.productId}`);
        const currentSlug = currentWcProduct.slug || slugify(currentWcProduct.name);

        console.log(`Syncing product ${params.productId} (slug: ${currentSlug})...`);

        // 2. Perform WooCommerce Update
        const { data: updatedWcProduct } = await woo.put(`products/${params.productId}`, body);

        // 3. Update/Sync Metadata (Ensure translations and ILS price are handled)
        // Extract values for sync logic
        const priceIlsVal = body.price_ils || body.meta_data?.find((m: any) => m.key === 'price_ils')?.value;
        const nameHeVal = body.name_he || body.meta_data?.find((m: any) => m.key === 'name_he')?.value;
        const descHeVal = body.description_he || body.meta_data?.find((m: any) => m.key === 'description_he')?.value;
        const shortDescHeVal = body.short_description_he || body.meta_data?.find((m: any) => m.key === 'short_description_he')?.value;

        // If for some reason the proxy needs redundant metadata push:
        if (priceIlsVal || nameHeVal || descHeVal || shortDescHeVal) {
            const meta_data: any[] = [];
            if (priceIlsVal) meta_data.push({ key: 'price_ils', value: priceIlsVal.toString() });
            if (nameHeVal) meta_data.push({ key: 'name_he', value: nameHeVal });
            if (descHeVal) meta_data.push({ key: 'description_he', value: descHeVal });
            if (shortDescHeVal) meta_data.push({ key: 'short_description_he', value: shortDescHeVal });

            try {
                // We perform this separately to be safe, especially if the primary update stripped them
                await woo.put(`products/${params.productId}`, { meta_data });
            } catch (metaErr) {
                console.error("Failed to sync translation metadata:", metaErr);
            }
        }

        // 4. Sync to Supabase (Local)
        if (supabaseAdmin) {
            try {
                // Find matching product in Supabase by SLUG
                const { data: sbProduct } = await supabaseAdmin
                    .from('products')
                    .select('id')
                    .eq('slug', currentSlug)
                    .single();

                if (sbProduct) {
                    // Prepare Supabase Payload
                    const sbUpdate: any = {
                        name: updatedWcProduct.name,
                        slug: updatedWcProduct.slug || slugify(updatedWcProduct.name),
                        description: body.description || updatedWcProduct.description.replace(/<[^>]*>?/gm, ''),
                        short_description: body.short_description, // New field
                        price: parseFloat(updatedWcProduct.price || '0'),
                        originalPrice: parseFloat(updatedWcProduct.regular_price || '0'),
                        stock: updatedWcProduct.stock_quantity,
                    };

                    // Handle Image
                    if (body.images && body.images.length > 0) {
                        sbUpdate.image = body.images[0].src;
                    } else if (updatedWcProduct.images && updatedWcProduct.images.length > 0) {
                        sbUpdate.image = updatedWcProduct.images[0].src;
                    }

                    // Handle Custom Meta (Translations)
                    if (priceIlsVal) sbUpdate.price_ils = parseFloat(priceIlsVal.toString());
                    if (nameHeVal) sbUpdate.name_he = nameHeVal;
                    if (descHeVal) sbUpdate.description_he = descHeVal;
                    if (shortDescHeVal) sbUpdate.short_description_he = shortDescHeVal;

                    console.log(`Updating Supabase product ${(sbProduct as any).id}...`, sbUpdate);

                    const { error: sbError } = await (supabaseAdmin
                        .from('products') as any)
                        .update(sbUpdate)
                        .eq('id', (sbProduct as any).id);

                    if (sbError) console.error('Supabase sync error:', sbError);
                }
            } catch (syncErr) {
                console.error('Failed to sync to Supabase:', syncErr);
            }
        }

        return NextResponse.json(updatedWcProduct);
    } catch (error: any) {
        console.error("Product update error:", error);
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
