/**
 * Brand Website Analysis API
 * Orchestrates scraping, visual extraction, and AI enhancement
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/auth/server';
import { analyzeWebsite } from '@/lib/brand/website-analyzer';
import { enhanceAllTabs } from '@/lib/brand/ai-enhancer-split';
import { extractWooCommerceProducts } from '@/lib/brand/woocommerce-extractor';

export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Get project data
    console.log('📊 Fetching project...');
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ 
        error: 'Project not found',
        details: projectError?.message 
      }, { status: 404 });
    }

    const website = project.website_url || project.website;
    if (!website) {
      return NextResponse.json({ 
        error: 'No website URL found. Please add your website to the project first.' 
      }, { status: 400 });
    }

    console.log(`🌐 Analyzing website: ${website}`);
    console.log(`🔑 Firecrawl API key exists: ${!!process.env.FIRECRAWL_API_KEY}`);

    // STAGE 1: Scrape website and extract visuals (20%)
    console.log('Stage 1: Scraping website...');
    const startTime = Date.now();
    const rawData = await analyzeWebsite(website);
    const scrapeTime = Date.now() - startTime;
    
    console.log(`⏱️ Scraping took ${scrapeTime}ms (should be 3000-10000ms)`);
    console.log(`📄 HTML length: ${rawData.rawHtml.length} chars`);
    console.log(`🎨 CSS length: ${rawData.rawCss.length} chars`);
    console.log(`📝 Content title: ${rawData.content.title}`);
    console.log(`✅ Extracted ${rawData.visuals.colors.length} colors, ${rawData.visuals.fonts.length} fonts`);
    
    if (scrapeTime < 2000) {
      console.error('❌ WARNING: Scraping too fast! Likely failed.');
    }
    
    if (rawData.rawHtml.length < 1000) {
      console.error('❌ WARNING: HTML too short! Scraping likely failed.');
      throw new Error('Scraping failed - insufficient data retrieved');
    }

    // STAGE 2: Extract WooCommerce Products (40%)
    console.log('Stage 2: Extracting WooCommerce products...');
    const productsData = await extractWooCommerceProducts(website);
    console.log(`✅ Found ${productsData.totalProducts} products, ${productsData.collections.length} collections`);

    // STAGE 3: AI Enhancement (60-85%) - Split into 6 tabs for completeness
    console.log('Stage 3: AI enhancing brand identity (6 tabs sequentially)...');
    const enhancedIdentity = await enhanceAllTabs(rawData);
    console.log('✅ All 6 tabs enhanced complete');

    // STAGE 3.5: Use EXACT scraped visuals (no AI needed for colors/fonts/logo)
    console.log('Stage 3.5: Using exact scraped visuals...');
    const finalIdentity = {
      ...enhancedIdentity,
      visual: {
        colors: {
          primary: rawData.visuals.colors.map(c => ({
            hex: c.hex,
            rgb: c.rgb,
            name: `Color ${c.hex}`,
            psychology: `Used in: ${c.context.join(', ')}`,
            usage: c.context.join(', ')
          }))
        },
        typography: {
          headings: rawData.visuals.fonts
            .filter(f => f.category === 'heading')
            .map(f => ({
              family: f.family,
              personality: `Heading font: ${f.family}`,
              usage: f.usage.join(', ')
            })),
          body: rawData.visuals.fonts
            .filter(f => f.category === 'body')
            .map(f => ({
              family: f.family,
              personality: `Body font: ${f.family}`,
              usage: f.usage.join(', ')
            }))
        },
        logo: {
          url: rawData.visuals.logo.url,
          source: rawData.visuals.logo.source,
          alt: rawData.visuals.logo.alt || 'Brand logo'
        },
        image_style: enhancedIdentity.visual?.image_style || '',
        mood: enhancedIdentity.visual?.mood || ''
      },
      // Add WooCommerce products data
      products_catalog: {
        products: productsData.products,
        collections: productsData.collections,
        totalProducts: productsData.totalProducts,
        lastSync: new Date().toISOString()
      }
    };
    console.log(`✅ Using scraped visuals: ${finalIdentity.visual.colors.primary.length} colors, ${finalIdentity.visual.typography.headings.length} heading fonts, ${finalIdentity.visual.typography.body.length} body fonts`);

    // STAGE 3: Save to database (95%)
    console.log('Stage 3: Saving to database...');
    const { error: updateError } = await supabase
      .from('projects')
      .update({ 
        brand_identity: finalIdentity 
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Failed to save brand identity:', updateError);
      return NextResponse.json({ 
        error: 'Failed to save brand identity',
        details: updateError.message 
      }, { status: 500 });
    }

    console.log('✅ Brand identity saved successfully');

    return NextResponse.json({
      success: true,
      brandIdentity: finalIdentity,
      stats: {
        colorsFound: rawData.visuals.colors.length,
        fontsFound: rawData.visuals.fonts.length,
        logoFound: !!rawData.visuals.logo.url,
        productsFound: productsData.totalProducts,
        collectionsFound: productsData.collections.length
      }
    });

  } catch (error: any) {
    console.error('❌ Brand analysis error:', error);
    return NextResponse.json({ 
      error: error.message || 'Analysis failed',
      details: error.toString()
    }, { status: 500 });
  }
}

