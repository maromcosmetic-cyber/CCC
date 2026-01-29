
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/auth/server';
import { generateProductImageWithIntent } from '@/lib/product-image/generators/intent-generator';
import { VertexImagenProvider } from '@/lib/providers/google-imagen/VertexImagenProvider';
import { GoogleVisionProvider } from '@/lib/providers/google-vision/GoogleVisionProvider';
import { SupabaseStorage } from '@/lib/providers/supabase/SupabaseStorage';
import { Product, ProductImageIntent } from '@/types/models';

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const projectId = params.id;

    try {
        const body = await req.json();
        const { productId, intent, productDetails } = body;

        if (!productId || !intent) {
            return NextResponse.json({ error: 'Missing productId or intent' }, { status: 400 });
        }

        // Init Services
        const supabase = createServiceRoleClient();
        const imagen = new VertexImagenProvider();
        const vision = new GoogleVisionProvider();
        const storage = new SupabaseStorage();

        // 1. Fetch Product (Just-in-Time Sync)
        // Try to find by source_id (WooCommerce ID) or id (UUID)
        let { data: product, error: productError } = await supabase
            .from('products')
            .select('*')
            .or(`id.eq.${productId},source_id.eq.${productId}`)
            .maybeSingle();

        // If not found, and we have details, create it
        if (!product && productDetails) {
            console.log(`[ProductImageAPI] Product ${productId} not found, syncing...`);
            const { data: newProduct, error: createError } = await supabase
                .from('products')
                .insert({
                    project_id: projectId,
                    source_id: productId,
                    name: productDetails.name,
                    description: productDetails.description,
                    price: productDetails.price,
                    currency: productDetails.currency,
                    images: productDetails.image_url ? [{ url: productDetails.image_url }] : [],
                    synced_at: new Date().toISOString()
                })
                .select()
                .single();

            if (createError) {
                console.error('[ProductImageAPI] Sync failed:', createError);
                return NextResponse.json({ error: 'Failed to sync product: ' + createError.message }, { status: 500 });
            }
            product = newProduct;
        }

        if (!product) {
            return NextResponse.json({ error: 'Product not found and details not provided for sync' }, { status: 404 });
        }

        const productEntity = product as Product;
        const productImageUrl = productEntity.images?.[0]?.url || productDetails?.image_url;

        if (!productImageUrl) {
            return NextResponse.json({ error: 'Product has no reference image' }, { status: 400 });
        }

        // 2. Generate Image
        const result = await generateProductImageWithIntent(
            productEntity,
            productImageUrl,
            intent as ProductImageIntent,
            imagen,
            vision
        );

        if (!result || !result.base64) {
            throw new Error('Image generation failed to produce output');
        }

        const base64Image = result.base64;
        const buffer = Buffer.from(base64Image, 'base64');

        // 3. Upload to Storage
        // Use verified product UUID for filename
        const filename = `${Date.now()}-${intent}-${product.id.slice(0, 8)}.png`;
        const storagePath = `${projectId}/generated-assets/${filename}`;

        const uploadResult = await storage.uploadFile(
            buffer,
            'generated-assets',
            storagePath,
            { contentType: 'image/png' }
        );

        // 4. Save to DB
        // Using any cast to bypass strict TS check on generated types vs simplified model
        const mediaAssetPayload: any = {
            project_id: projectId,
            storage_path: uploadResult.path,
            storage_bucket: 'generated-assets',
            file_type: 'image',
            mime_type: 'image/png',
            storage_url: uploadResult.url,
            is_public: true,
            product_ids: [product.id], // Use the UUID from the DB record
            image_type: 'product_only', // Using existing type for now, metadata holds intent
            metadata: {
                intent: intent,
                generated_by: 'product_image_intent_system',
                source_product_id: productId // Keep track of the original source ID
            },
            approved: false
        };

        const { data: mediaAsset, error: dbError } = await supabase
            .from('media_assets')
            .insert(mediaAssetPayload)
            .select()
            .single();

        if (dbError) {
            throw new Error('Failed to save media asset: ' + dbError.message);
        }

        return NextResponse.json({ success: true, asset: mediaAsset });

    } catch (error: any) {
        console.error('[ProductImageAPI] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
