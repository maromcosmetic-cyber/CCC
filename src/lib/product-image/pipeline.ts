/**
 * Audience Image Generation Pipeline
 * 
 * Orchestrates the complete image generation process:
 * 1. Read Brand Identity Playbook
 * 2. Extract Persona & Audience Data
 * 3. Generate 10-15 images (product-only, product+persona, UGC style)
 * 4. Quality Validation
 * 5. Realism Enhancement (upscaling)
 * 6. Store & Tag
 */

import { BrandIdentityPlaybook, AudienceImageGenerationConfig, ImageType, GeneratedImage, Product } from '@/types/models';
import { readPlaybook } from './playbook-reader';
import { getAudienceContext, getPersonaContext } from './persona-context';
import { planProductOnlyScene, planProductPersonaScene, planUGCStyleScene } from './scene-planner';
import { generateProductOnlyImage } from './generators/product-only-generator';
import { generateProductPersonaImage } from './generators/product-persona-generator';
import { generateUGCImage } from './generators/ugc-generator';
import { validateImageQuality } from './quality-validator';
import { enhanceImageForRealism } from './realism-enhancer';
import { SupabaseStorage } from '@/lib/providers/supabase/SupabaseStorage';
import { supabaseAdmin } from '@/lib/db/client';
import { VertexImagenProvider } from '@/lib/providers/google-imagen/VertexImagenProvider';
import { ReplicateProvider } from '../providers/replicate/ReplicateProvider'; // Added import
import { GoogleVisionProvider } from '@/lib/providers/google-vision/GoogleVisionProvider';

export interface PipelineResult {
  generated_images: GeneratedImage[];
  errors: string[];
  warnings: string[];
}

export interface ProgressCallback {
  (step: string, progress: { current: number; total: number; details?: string }): Promise<void>;
}

/**
 * Generate all images for an audience (10-15 images total)
 */
export async function generateAudienceImages(
  projectId: string,
  audienceId: string,
  config: AudienceImageGenerationConfig,
  onProgress?: ProgressCallback
): Promise<PipelineResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const generatedImages: GeneratedImage[] = [];

  try {
    // Step 1: Read Brand Identity Playbook
    if (onProgress) await onProgress('Reading brand playbook...', { current: 0, total: 10 });
    console.log('📖 Reading Brand Identity Playbook...');
    const playbook = await readPlaybook(projectId);
    if (!playbook) {
      throw new Error('Brand identity playbook not found');
    }

    // Step 2: Get Audience & Persona Context
    if (onProgress) await onProgress('Loading audience & persona data...', { current: 1, total: 10 });
    console.log('👤 Getting audience and persona context...');
    const audienceContext = await getAudienceContext(projectId, audienceId);
    if (!audienceContext || !audienceContext.audience) {
      throw new Error('Audience not found');
    }

    const personaName = audienceContext.audience.name;
    let personaContext = null;
    if (personaName) {
      personaContext = await getPersonaContext(projectId, personaName);
    }

    // Step 3: Get Products
    if (onProgress) await onProgress('Fetching products...', { current: 2, total: 10 });
    console.log('📦 Fetching products...');
    console.log('📦 Looking for product IDs:', config.product_ids);

    // Try to find products by UUID first (database products)
    let { data: products, error: productsError } = await supabaseAdmin
      ?.from('products')
      .select('*')
      .in('id', config.product_ids)
      .eq('project_id', projectId);

    // If not found by UUID, try by source_id (WooCommerce products)
    if ((productsError || !products || products.length === 0) && config.product_ids.length > 0) {
      console.log('📦 Products not found by UUID, trying source_id (WooCommerce)...');
      const { data: productsBySource, error: sourceError } = await supabaseAdmin
        ?.from('products')
        .select('*')
        .in('source_id', config.product_ids)
        .eq('project_id', projectId);

      if (!sourceError && productsBySource && productsBySource.length > 0) {
        products = productsBySource;
        productsError = null;
        console.log(`✅ Found ${products.length} products by source_id`);
      } else {
        // If still not found, create temporary product records from WooCommerce IDs
        // This allows testing without full sync
        console.log('⚠️ Products not in database. Creating temporary records for WooCommerce products...');
        products = [];
        for (const productId of config.product_ids) {
          // Try to fetch from WooCommerce API if possible
          // For now, we'll need the product data passed in or fetched separately
          // This is a fallback - ideally products should be synced first
        }
      }
    }

    if (productsError || !products || products.length === 0) {
      console.error('❌ Products not found:', {
        searched_ids: config.product_ids,
        project_id: projectId,
        error: productsError
      });
      throw new Error(`Products not found. Please ensure products are synced to the database first, or use product UUIDs instead of WooCommerce IDs. Searched for: ${config.product_ids.join(', ')}`);
    }

    console.log(`✅ Found ${products.length} products`);

    // Calculate total images to generate
    const imageTypes = config.image_types || ['product_only', 'product_persona', 'ugc_style'];
    const variationsPerType = config.variations_per_type || {
      product_only: 4,
      product_persona: 5,
      ugc_style: 3,
    };
    let totalImages = 0;
    if (imageTypes.includes('product_only')) {
      const count = typeof variationsPerType === 'number' ? variationsPerType : variationsPerType.product_only || 4;
      totalImages += Math.min(count, products.length);
    }
    if (imageTypes.includes('product_persona') && personaContext?.persona) {
      const count = typeof variationsPerType === 'number' ? variationsPerType : variationsPerType.product_persona || 5;
      totalImages += Math.min(count, products.length);
    }
    if (imageTypes.includes('ugc_style') && personaContext?.persona) {
      const count = typeof variationsPerType === 'number' ? variationsPerType : variationsPerType.ugc_style || 3;
      totalImages += Math.min(count, products.length);
    }

    // Initialize providers
    // Use Vertex for standard product shots (Legacy/Alpha Channel support)
    const vertexImagen = new VertexImagenProvider();
    // Use Replicate for high-fidelity Persona generation (Product+Persona)
    const replicate = new ReplicateProvider();
    const vision = new GoogleVisionProvider();
    const storage = new SupabaseStorage();

    // Step 4: Generate Image Set (10-15 images)
    // Distribution:
    // - Product-Only: 3-5 images
    // - Product+Persona: 4-6 images  
    // - UGC Style: 3-4 images

    let imageCount = 0;

    // Generate Product-Only Images
    if (imageTypes.includes('product_only')) {
      const count = typeof variationsPerType === 'number'
        ? variationsPerType
        : variationsPerType.product_only || 4;

      if (onProgress) await onProgress('Generating product-only images...', { current: 3, total: 10 });
      console.log('🎨 Generating product-only images...');

      for (let i = 0; i < count && i < products.length; i++) {
        imageCount++;
        if (onProgress) {
          await onProgress(`Creating product image ${imageCount}/${totalImages}...`, {
            current: imageCount,
            total: totalImages,
            details: `Product-only image ${i + 1}`
          });
        }
        try {
          const product = products[i] as any as Product;
          const productImageUrl = product.images?.[0]?.url;
          if (!productImageUrl) {
            warnings.push(`Product ${product.name} has no image, skipping`);
            continue;
          }

          // Plan scene
          if (onProgress) {
            await onProgress(`Planning scene for ${product.name}...`, {
              current: imageCount,
              total: totalImages,
              details: 'AI analyzing brand guidelines and product context'
            });
          }
          const scenePlan = await planProductOnlyScene(
            playbook,
            audienceContext.audience,
            {
              name: product.name,
              description: product.description,
              category: product.metadata?.category as string,
            },
            {
              angle: config.angle,
              funnel_stage: config.funnel_stage,
            }
          );

          // Generate image
          if (onProgress) {
            await onProgress(`Isolating product from background...`, {
              current: imageCount,
              total: totalImages,
              details: 'AI vision model removing background'
            });
          }
          const result = await generateProductOnlyImage(
            productImageUrl,
            scenePlan,
            vertexImagen, // Use Google/Vertex for product only
            vision,
            replicate // Use Replicate for AI Relighting (Post-Process)
          );

          if (onProgress) {
            await onProgress(`Generating image with AI...`, {
              current: imageCount,
              total: totalImages,
              details: 'AI creating scene based on brand guidelines'
            });
          }

          // Validate quality
          if (onProgress) {
            await onProgress(`Validating image quality...`, {
              current: imageCount,
              total: totalImages,
              details: 'AI checking image meets quality standards'
            });
          }
          const validation = await validateImageQuality(
            result.final_image.base64 || '',
            result.isolated_product.isolated_image,
            playbook
          );

          if (!validation.passed) {
            warnings.push(`Quality validation failed for product-only image ${i + 1}`);
            if (validation.errors) {
              warnings.push(...validation.errors);
            }
          }

          // Enhance for realism
          if (onProgress) {
            await onProgress(`Enhancing image realism...`, {
              current: imageCount,
              total: totalImages,
              details: 'AI upscaling and enhancing details'
            });
          }
          const enhancedBase64 = await enhanceImageForRealism(
            result.final_image.base64 || '',
            'product_only',
            2, // 2x upscaling
            (result as any).overlay_image
          );

          if (onProgress) {
            await onProgress(`Saving image ${imageCount}/${totalImages}...`, {
              current: imageCount,
              total: totalImages,
              details: 'Uploading to storage'
            });
          }

          // Store image
          const imageBuffer = Buffer.from(enhancedBase64, 'base64');
          const storagePath = `${projectId}/generated-assets/${Date.now()}-product-only-${i}.png`;
          const uploadResult = await storage.uploadFile(
            imageBuffer,
            'generated-assets',
            storagePath,
            { contentType: 'image/png' }
          );

          // Create media asset record
          const { data: mediaAsset } = await supabaseAdmin
            ?.from('media_assets')
            .insert({
              project_id: projectId,
              storage_path: uploadResult.path,
              storage_bucket: 'generated-assets',
              file_type: 'image',
              mime_type: 'image/png',
              storage_url: uploadResult.url,
              is_public: true,
              audience_id: audienceId,
              persona_name: personaContext?.persona.name,
              image_type: 'product_only',
              product_ids: [product.id],
              prompt_lineage: {
                scene_plan: scenePlan,
                validation,
              },
              approved: false,
            })
            .select()
            .single();

          if (mediaAsset) {
            generatedImages.push({
              id: mediaAsset.id,
              image_type: 'product_only',
              product_ids: [product.id],
              storage_path: uploadResult.path,
              storage_url: uploadResult.url,
              metadata: {
                audience_id: audienceId,
                persona_name: personaContext?.persona.name,
                campaign_id: config.campaign_id,
                platform: config.platform,
                funnel_stage: config.funnel_stage,
                angle: config.angle,
                scene_plan: scenePlan,
                validation,
              },
              created_at: mediaAsset.created_at,
            });
          }
        } catch (error: any) {
          errors.push(`Failed to generate product-only image ${i + 1}: ${error.message}`);
        }
      }
    }

    // Generate Product+Persona Images
    if (imageTypes.includes('product_persona') && personaContext?.persona) {
      if (onProgress) await onProgress('Generating product+persona images...', { current: 6, total: 10 });
      console.log('👥 Generating product+persona images...');
      const count = typeof variationsPerType === 'number'
        ? variationsPerType
        : variationsPerType.product_persona || 5;

      for (let i = 0; i < count && i < products.length; i++) {
        imageCount++;
        if (onProgress) {
          await onProgress(`Creating product+persona image ${imageCount}/${totalImages}...`, {
            current: imageCount,
            total: totalImages,
            details: `Product+persona image ${i + 1}`
          });
        }
        try {
          const product = products[i] as any as Product;
          const productImageUrl = product.images?.[0]?.url;
          if (!productImageUrl) {
            warnings.push(`Product ${product.name} has no image, skipping`);
            continue;
          }

          // Plan scene
          if (onProgress) {
            await onProgress(`Planning scene with persona...`, {
              current: imageCount,
              total: totalImages,
              details: 'AI analyzing persona and product context'
            });
          }
          const scenePlan = await planProductPersonaScene(
            playbook,
            personaContext.persona,
            audienceContext.audience,
            {
              name: product.name,
              description: product.description,
            },
            {
              angle: config.angle,
              funnel_stage: config.funnel_stage,
            }
          );

          // Generate image
          if (onProgress) {
            await onProgress(`Isolating product from background...`, {
              current: imageCount,
              total: totalImages,
              details: 'AI vision model removing background'
            });
          }
          const result = await generateProductPersonaImage(
            productImageUrl,
            personaContext.persona,
            scenePlan,
            replicate, // Use Replicate for Persona+Product (New Workflow)
            vision
          );

          if (onProgress) {
            await onProgress(`Generating scene with persona...`, {
              current: imageCount,
              total: totalImages,
              details: 'AI creating scene with product and persona'
            });
          }

          // Validate quality
          if (onProgress) {
            await onProgress(`Validating image quality...`, {
              current: imageCount,
              total: totalImages,
              details: 'AI checking image meets quality standards'
            });
          }
          const validation = await validateImageQuality(
            result.final_image.base64 || '',
            result.isolated_product.isolated_image,
            playbook,
            personaContext.persona,
            'product_persona'
          );

          if (!validation.passed) {
            warnings.push(`Quality validation failed for product+persona image ${i + 1}`);
          }

          // Enhance for realism
          if (onProgress) {
            await onProgress(`Enhancing image realism...`, {
              current: imageCount,
              total: totalImages,
              details: 'AI upscaling and enhancing details'
            });
          }
          const enhancedBase64 = await enhanceImageForRealism(
            result.final_image.base64 || '',
            'product_persona',
            2,
            (result as any).overlay_image
          );

          if (onProgress) {
            await onProgress(`Saving image ${imageCount}/${totalImages}...`, {
              current: imageCount,
              total: totalImages,
              details: 'Uploading to storage'
            });
          }

          // Store image
          const imageBuffer = Buffer.from(enhancedBase64, 'base64');
          const storagePath = `${projectId}/generated-assets/${Date.now()}-product-persona-${i}.png`;
          const uploadResult = await storage.uploadFile(
            imageBuffer,
            'generated-assets',
            storagePath,
            { contentType: 'image/png' }
          );

          // Create media asset record
          const { data: mediaAsset } = await supabaseAdmin
            ?.from('media_assets')
            .insert({
              project_id: projectId,
              storage_path: uploadResult.path,
              storage_bucket: 'generated-assets',
              file_type: 'image',
              mime_type: 'image/png',
              storage_url: uploadResult.url,
              is_public: true,
              audience_id: audienceId,
              persona_name: personaContext.persona.name,
              image_type: 'product_persona',
              product_ids: [product.id],
              prompt_lineage: {
                scene_plan: scenePlan,
                validation,
              },
              approved: false,
            })
            .select()
            .single();

          if (mediaAsset) {
            generatedImages.push({
              id: mediaAsset.id,
              image_type: 'product_persona',
              product_ids: [product.id],
              storage_path: uploadResult.path,
              storage_url: uploadResult.url,
              metadata: {
                audience_id: audienceId,
                persona_name: personaContext.persona.name,
                campaign_id: config.campaign_id,
                platform: config.platform,
                funnel_stage: config.funnel_stage,
                angle: config.angle,
                scene_plan: scenePlan,
                validation,
              },
              created_at: mediaAsset.created_at,
            });
          }
        } catch (error: any) {
          errors.push(`Failed to generate product+persona image ${i + 1}: ${error.message}`);
        }
      }
    }

    // Generate UGC Style Images
    if (imageTypes.includes('ugc_style') && personaContext?.persona) {
      if (onProgress) await onProgress('Generating UGC style images...', { current: 8, total: 10 });
      console.log('📹 Generating UGC style images...');
      const count = typeof variationsPerType === 'number'
        ? variationsPerType
        : variationsPerType.ugc_style || 3;

      for (let i = 0; i < count && i < products.length; i++) {
        imageCount++;
        if (onProgress) {
          await onProgress(`Creating UGC image ${imageCount}/${totalImages}...`, {
            current: imageCount,
            total: totalImages,
            details: `UGC style image ${i + 1}`
          });
        }
        try {
          const product = products[i] as any as Product;
          const productImageUrl = product.images?.[0]?.url;
          if (!productImageUrl) {
            warnings.push(`Product ${product.name} has no image, skipping`);
            continue;
          }

          // Plan scene
          if (onProgress) {
            await onProgress(`Planning UGC style scene...`, {
              current: imageCount,
              total: totalImages,
              details: 'AI analyzing UGC style and persona context'
            });
          }
          const scenePlan = await planUGCStyleScene(
            playbook,
            personaContext.persona,
            audienceContext.audience,
            {
              name: product.name,
              description: product.description,
            },
            {
              angle: config.angle,
            }
          );

          // Generate image
          if (onProgress) {
            await onProgress(`Isolating product from background...`, {
              current: imageCount,
              total: totalImages,
              details: 'AI vision model removing background'
            });
          }
          const result = await generateUGCImage(
            productImageUrl,
            personaContext.persona,
            scenePlan,
            vertexImagen, // Use Google/Vertex for UGC (Legacy)
            vision
          );

          if (onProgress) {
            await onProgress(`Generating UGC style scene...`, {
              current: imageCount,
              total: totalImages,
              details: 'AI creating authentic UGC-style image'
            });
          }

          // Validate quality
          if (onProgress) {
            await onProgress(`Validating image quality...`, {
              current: imageCount,
              total: totalImages,
              details: 'AI checking image meets quality standards'
            });
          }
          const validation = await validateImageQuality(
            result.final_image.base64 || '',
            result.isolated_product.isolated_image,
            playbook,
            personaContext.persona,
            'ugc_style'
          );

          if (!validation.passed) {
            warnings.push(`Quality validation failed for UGC image ${i + 1}`);
          }

          // Enhance for realism
          if (onProgress) {
            await onProgress(`Enhancing image realism...`, {
              current: imageCount,
              total: totalImages,
              details: 'AI upscaling and enhancing details'
            });
          }
          // Use the overlay_image returned by the generator for the Fidelity Sandwich
          const enhancedBase64 = await enhanceImageForRealism(
            result.final_image.base64 || '',
            'ugc_style',
            2,
            (result as any).overlay_image // Type assertion if interface isn't fully updated globally yet, safeguards execution
          );

          if (onProgress) {
            await onProgress(`Saving image ${imageCount}/${totalImages}...`, {
              current: imageCount,
              total: totalImages,
              details: 'Uploading to storage'
            });
          }

          // Store image
          const imageBuffer = Buffer.from(enhancedBase64, 'base64');
          const storagePath = `${projectId}/generated-assets/${Date.now()}-ugc-${i}.png`;
          const uploadResult = await storage.uploadFile(
            imageBuffer,
            'generated-assets',
            storagePath,
            { contentType: 'image/png' }
          );

          // Create media asset record
          const { data: mediaAsset } = await supabaseAdmin
            ?.from('media_assets')
            .insert({
              project_id: projectId,
              storage_path: uploadResult.path,
              storage_bucket: 'generated-assets',
              file_type: 'image',
              mime_type: 'image/png',
              storage_url: uploadResult.url,
              is_public: true,
              audience_id: audienceId,
              persona_name: personaContext.persona.name,
              image_type: 'ugc_style',
              product_ids: [product.id],
              prompt_lineage: {
                scene_plan: scenePlan,
                validation,
              },
              approved: false,
            })
            .select()
            .single();

          if (mediaAsset) {
            generatedImages.push({
              id: mediaAsset.id,
              image_type: 'ugc_style',
              product_ids: [product.id],
              storage_path: uploadResult.path,
              storage_url: uploadResult.url,
              metadata: {
                audience_id: audienceId,
                persona_name: personaContext.persona.name,
                campaign_id: config.campaign_id,
                platform: config.platform,
                funnel_stage: config.funnel_stage,
                angle: config.angle,
                scene_plan: scenePlan,
                validation,
              },
              created_at: mediaAsset.created_at,
            });
          }
        } catch (error: any) {
          errors.push(`Failed to generate UGC image ${i + 1}: ${error.message}`);
        }
      }
    }

    return {
      generated_images: generatedImages,
      errors,
      warnings,
    };
  } catch (error: any) {
    errors.push(`Pipeline failed: ${error.message}`);
    return {
      generated_images: generatedImages,
      errors,
      warnings,
    };
  }
}
