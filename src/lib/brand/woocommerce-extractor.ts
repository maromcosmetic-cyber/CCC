/**
 * WooCommerce Product Extractor
 * Extracts structured product data from WooCommerce stores
 */

export interface WooCommerceProduct {
  id: string;
  name: string;
  description: string;
  price: string;
  regularPrice?: string;
  salePrice?: string;
  image: string;
  categories: string[];
  url: string;
  sku?: string;
  inStock: boolean;
}

export interface WooCommerceCollection {
  name: string;
  slug: string;
  description: string;
  productCount: number;
  url: string;
}

export interface WooCommerceData {
  products: WooCommerceProduct[];
  collections: WooCommerceCollection[];
  totalProducts: number;
}

/**
 * Extract WooCommerce products from website
 */
export async function extractWooCommerceProducts(websiteUrl: string): Promise<WooCommerceData> {
  console.log('🛍️ Extracting WooCommerce products from:', websiteUrl);

  const products: WooCommerceProduct[] = [];
  const collections: WooCommerceCollection[] = [];

  try {
    const baseUrl = new URL(websiteUrl).origin;

    // Try WooCommerce REST API first (if accessible)
    const apiProducts = await tryWooCommerceAPI(baseUrl);
    if (apiProducts.products.length > 0) {
      console.log(`✅ WooCommerce API: Found ${apiProducts.products.length} products`);
      return apiProducts;
    }

    // Fallback: Scrape product pages
    console.log('🔄 Falling back to page scraping...');
    const scrapedProducts = await scrapeProductPages(baseUrl);

    return scrapedProducts;

  } catch (error) {
    console.error('❌ Error extracting products:', error);
    return { products: [], collections: [], totalProducts: 0 };
  }
}

/**
 * Try WooCommerce REST API (public endpoints)
 */
async function tryWooCommerceAPI(baseUrl: string): Promise<WooCommerceData> {
  const products: WooCommerceProduct[] = [];
  const collections: WooCommerceCollection[] = [];

  try {
    // Try public WooCommerce endpoints
    const endpoints = [
      '/wp-json/wc/store/products',
      '/wp-json/wc/v3/products', // Requires auth usually
    ];

    for (const endpoint of endpoints) {
      try {
        const url = `${baseUrl}${endpoint}?per_page=50`;
        console.log('🔍 Trying:', url);

        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ API response received:', data.length || 0, 'items');

          // Parse products
          if (Array.isArray(data)) {
            data.forEach((item: any) => {
              products.push(parseWooCommerceProduct(item, baseUrl));
            });
          }

          if (products.length > 0) {
            // We found products on page 1, now try to fetch subsequent pages
            // Loop until we get no results or a 404
            let page = 2;
            let hasMore = true;

            while (hasMore) {
              try {
                const nextUrl = `${baseUrl}${endpoint}?per_page=50&page=${page}`;
                console.log('🔍 Fetching next page:', nextUrl);

                const nextRes = await fetch(nextUrl, {
                  headers: { 'User-Agent': 'Mozilla/5.0' }
                });

                if (nextRes.ok) {
                  const nextData = await nextRes.json();
                  if (Array.isArray(nextData) && nextData.length > 0) {
                    console.log(`✅ Page ${page} found ${nextData.length} items`);
                    nextData.forEach((item: any) => {
                      products.push(parseWooCommerceProduct(item, baseUrl));
                    });

                    if (nextData.length < 50) {
                      hasMore = false; // Last page
                    } else {
                      page++;
                    }
                  } else {
                    hasMore = false;
                  }
                } else {
                  hasMore = false;
                }
              } catch (e) {
                console.log(`ℹ️ Error fetching page ${page}:`, e);
                hasMore = false;
              }

              // Safety break
              if (page > 50) hasMore = false;
            }

            console.log(`✅ Total products found via API: ${products.length}`);

            // Try to get categories
            try {
              const catUrl = `${baseUrl}/wp-json/wc/store/products/categories?per_page=50`;
              const catResponse = await fetch(catUrl);
              if (catResponse.ok) {
                const categories = await catResponse.json();
                categories.forEach((cat: any) => {
                  collections.push({
                    name: cat.name,
                    slug: cat.slug,
                    description: cat.description || '',
                    productCount: cat.count || 0,
                    url: cat.link || `${baseUrl}/product-category/${cat.slug}`
                  });
                });
              }
            } catch (e) {
              console.log('ℹ️ Could not fetch categories');
            }

            return { products, collections, totalProducts: products.length };
          }
        }
      } catch (e) {
        console.log(`ℹ️ ${endpoint} not accessible`);
      }
    }
  } catch (error) {
    console.log('ℹ️ WooCommerce API not available');
  }

  return { products: [], collections: [], totalProducts: 0 };
}

/**
 * Parse WooCommerce API product response
 */
function parseWooCommerceProduct(item: any, baseUrl: string): WooCommerceProduct {
  return {
    id: String(item.id),
    name: item.name || 'Unnamed Product',
    description: stripHtml(item.short_description || item.description || ''),
    price: item.prices?.price || item.price || '',
    regularPrice: item.prices?.regular_price || item.regular_price,
    salePrice: item.prices?.sale_price || item.sale_price,
    image: item.images?.[0]?.src || item.image?.src || '',
    categories: item.categories?.map((c: any) => c.name) || [],
    url: item.permalink || item.link || `${baseUrl}/product/${item.slug}`,
    sku: item.sku,
    inStock: item.is_purchasable !== false && item.is_in_stock !== false
  };
}

/**
 * Scrape products from HTML pages
 */
async function scrapeProductPages(baseUrl: string): Promise<WooCommerceData> {
  const products: WooCommerceProduct[] = [];
  const collections: WooCommerceCollection[] = [];

  try {
    // Try shop page
    const shopPages = ['/shop', '/products', '/store'];

    for (const page of shopPages) {
      try {
        const url = `${baseUrl}${page}`;
        const response = await fetch(url);

        if (response.ok) {
          const html = await response.text();

          // Extract JSON-LD structured data
          const structuredProducts = extractStructuredData(html, baseUrl);
          products.push(...structuredProducts);

          // Extract from HTML if no structured data
          if (products.length === 0) {
            const htmlProducts = extractProductsFromHTML(html, baseUrl);
            products.push(...htmlProducts);
          }

          if (products.length > 0) {
            console.log(`✅ Scraped ${products.length} products from ${page}`);
            break;
          }
        }
      } catch (e) {
        console.log(`ℹ️ ${page} not found`);
      }
    }
  } catch (error) {
    console.error('Error scraping products:', error);
  }

  return { products, collections, totalProducts: products.length };
}

/**
 * Extract products from JSON-LD structured data
 */
function extractStructuredData(html: string, baseUrl: string): WooCommerceProduct[] {
  const products: WooCommerceProduct[] = [];

  try {
    const scriptMatches = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/gis);

    if (scriptMatches) {
      scriptMatches.forEach(match => {
        try {
          const jsonContent = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
          const data = JSON.parse(jsonContent);

          // Single product
          if (data['@type'] === 'Product') {
            products.push(parseStructuredProduct(data, baseUrl));
          }

          // Multiple products in @graph
          if (data['@graph']) {
            data['@graph'].forEach((item: any) => {
              if (item['@type'] === 'Product') {
                products.push(parseStructuredProduct(item, baseUrl));
              }
            });
          }
        } catch (e) {
          // Skip invalid JSON
        }
      });
    }
  } catch (error) {
    console.log('ℹ️ No structured data found');
  }

  return products;
}

/**
 * Parse structured data product
 */
function parseStructuredProduct(data: any, baseUrl: string): WooCommerceProduct {
  return {
    id: data.sku || String(Math.random()),
    name: data.name || 'Unnamed Product',
    description: stripHtml(data.description || ''),
    price: data.offers?.price || data.price || '',
    regularPrice: data.offers?.price,
    image: data.image || data.image?.[0] || '',
    categories: [],
    url: data.url || data['@id'] || baseUrl,
    sku: data.sku,
    inStock: data.offers?.availability !== 'OutOfStock'
  };
}

/**
 * Extract products from HTML structure
 */
function extractProductsFromHTML(html: string, baseUrl: string): WooCommerceProduct[] {
  const products: WooCommerceProduct[] = [];

  // This is a basic implementation - can be enhanced with proper HTML parsing
  // WooCommerce typically uses .product class
  const productMatches = html.match(/<li[^>]*class="[^"]*product[^"]*"[^>]*>(.*?)<\/li>/gis);

  if (productMatches) {
    productMatches.forEach((match, index) => {
      try {
        const nameMatch = match.match(/<h2[^>]*>(.*?)<\/h2>/i) || match.match(/class="woocommerce-loop-product__title"[^>]*>(.*?)</i);
        const priceMatch = match.match(/<span class="[^"]*price[^"]*"[^>]*>(.*?)<\/span>/i);
        const linkMatch = match.match(/href="([^"]+)"/i);
        const imgMatch = match.match(/<img[^>]*src="([^"]+)"/i);

        if (nameMatch) {
          products.push({
            id: String(index),
            name: stripHtml(nameMatch[1]),
            description: '',
            price: priceMatch ? stripHtml(priceMatch[1]) : '',
            image: imgMatch ? imgMatch[1] : '',
            categories: [],
            url: linkMatch ? linkMatch[1] : baseUrl,
            inStock: true
          });
        }
      } catch (e) {
        // Skip invalid product
      }
    });
  }

  return products;
}

/**
 * Strip HTML tags
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

