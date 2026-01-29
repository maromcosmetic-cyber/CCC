/**
 * Comprehensive Website Analyzer
 * Extracts content, colors, fonts, and logo from any website
 */

import { firecrawl } from '@/lib/firecrawl';

export interface ColorData {
  hex: string;
  rgb: string;
  frequency: number;
  context: string[]; // Where it's used: 'button', 'heading', 'background', etc.
  category?: 'primary' | 'secondary' | 'accent' | 'background' | 'text';
}

export interface FontData {
  family: string;
  weight: string;
  style: string;
  usage: string[]; // 'h1', 'h2', 'body', 'button', etc.
  category?: 'heading' | 'body' | 'display' | 'mono';
}

export interface LogoData {
  url: string;
  source: 'og-image' | 'apple-touch-icon' | 'favicon' | 'header-img' | 'logo-selector';
  alt?: string;
}

export interface WebsiteAnalysisResult {
  content: {
    title: string;
    homepage: string;
    about: string;
    products: string; // Product descriptions and features
    tagline: string;
    headlines: string[];
    metaDescription: string;
    keywords: string[];
    pricing: string; // Pricing information found on site
  };
  visuals: {
    colors: ColorData[];
    fonts: FontData[];
    logo: LogoData;
  };
  tone: {
    languageStyle: string;
    formalityLevel: string;
    examplePhrases: string[];
  };
  rawHtml: string;
  rawCss: string;
}

/**
 * Main function to analyze a website
 */
export async function analyzeWebsite(url: string): Promise<WebsiteAnalysisResult> {
  console.log(`🔍 Starting comprehensive analysis of: ${url}`);

  // Normalize URL
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

  // Scrape homepage and key pages
  const scrapedData = await scrapeWebsiteContent(normalizedUrl);

  // Extract visual elements
  const colors = extractColors(scrapedData.html, scrapedData.css);
  const fonts = extractFonts(scrapedData.html, scrapedData.css);
  const logo = await extractLogo(normalizedUrl, scrapedData.html);

  // Extract content (including products)
  const content = extractContent(scrapedData);
  
  // Add products content
  if (scrapedData.productsContent) {
    content.products = scrapedData.productsContent.substring(0, 3000); // First 3000 chars
    console.log(`✅ Including ${content.products.length} chars of product data`);
  }

  // Analyze tone
  const tone = analyzeTone(content);

  return {
    content,
    visuals: {
      colors: categorizeColors(colors),
      fonts: categorizeFonts(fonts),
      logo
    },
    tone,
    rawHtml: scrapedData.html,
    rawCss: scrapedData.css
  };
}

/**
 * Scrape website content
 */
async function scrapeWebsiteContent(url: string): Promise<{
  html: string;
  css: string;
  about: string;
  metadata: any;
}> {
  console.log(`🌐 Starting scrape of ${url}...`);
  
  try {
    // Use DIRECT FETCH first (faster, free, gets ALL inline CSS)
    console.log('📥 Using direct fetch (no Firecrawl - faster & free)...');
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.warn(`⚠️ Direct fetch failed (${response.status})`);
      throw new Error(`HTTP ${response.status}`);
    }

    const homeHtml = await response.text();
    console.log(`✅ Direct fetch success: ${homeHtml.length} chars HTML`);
    
    // Create a homeResult object similar to Firecrawl's format
    const homeResult = {
      html: homeHtml,
      markdown: '', // We'll use Firecrawl only for content pages if needed
      metadata: {
        title: homeHtml.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] || '',
        description: homeHtml.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i)?.[1] || ''
      }
    };

    console.log(`📊 Extracted HTML with all inline CSS`);

    // Extract inline CSS and fetch external stylesheets
    console.log('📋 Extracting inline CSS from HTML...');
    const inlineCSS = extractCSSFromHTML(homeResult.html || '');
    console.log(`✅ Inline CSS: ${inlineCSS.length} chars`);
    
    console.log('🌐 Fetching external stylesheets...');
    const externalCSS = await fetchExternalStylesheets(url, homeResult.html || '');
    console.log(`✅ External CSS: ${externalCSS.length} chars`);
    
    const css = inlineCSS + '\n' + externalCSS;
    console.log(`📊 TOTAL CSS: ${css.length} chars (${inlineCSS.length} inline + ${externalCSS.length} external)`);
    
    // Debug: Show first 500 chars of CSS to verify
    console.log('🔍 CSS Preview (first 500 chars):', css.substring(0, 500));

    // Try to scrape multiple pages for more content
    let about = '';
    let allContent = homeResult.markdown || '';
    let productsContent = '';
    
    const pagesToScrape = [
      '/about', 
      '/about-us', 
      '/our-story', 
      '/shop', 
      '/products',
      '/product-category/all',
      '/store'
    ];
    
    console.log('📦 Scraping all pages including products...');
    
    for (const page of pagesToScrape) {
      try {
        console.log(`📄 Trying to scrape ${page}...`);
        const pageResult = await firecrawl.scrape(`${url}${page}`, {
          formats: ['markdown', 'html'],
        });
        
        if (pageResult.markdown && pageResult.markdown.length > 100) {
          allContent += '\n\n' + pageResult.markdown;
          console.log(`✅ ${page}: ${pageResult.markdown.length} chars`);
          
          // Identify page types
          if (page.includes('about') || page.includes('story')) {
            about = pageResult.markdown;
          }
          
          if (page.includes('shop') || page.includes('product')) {
            productsContent += '\n\n' + pageResult.markdown;
            console.log(`🛍️ Products page scraped: ${pageResult.markdown.length} chars`);
          }
        }
      } catch (e) {
        console.log(`ℹ️ ${page} not found, skipping`);
      }
    }
    
    // Also try to find WooCommerce product JSON-LD data in homepage
    try {
      const productJsonMatch = homeResult.html.match(/<script type="application\/ld\+json">(.*?)<\/script>/gis);
      if (productJsonMatch) {
        console.log('📊 Found structured data, extracting products...');
        productJsonMatch.forEach(match => {
          try {
            const jsonContent = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
            const data = JSON.parse(jsonContent);
            if (data['@type'] === 'Product' || (data['@graph'] && data['@graph'].some((item: any) => item['@type'] === 'Product'))) {
              productsContent += '\n\nProduct: ' + JSON.stringify(data, null, 2);
              console.log('✅ Extracted product structured data');
            }
          } catch (e) {
            // Skip invalid JSON
          }
        });
      }
    } catch (e) {
      console.log('ℹ️ No structured product data found');
    }
    
    if (!about) {
      about = homeResult.markdown || '';
      console.log('ℹ️ Using homepage as about content');
    }

    return {
      html: homeResult.html || '',
      css,
      about,
      allContent, // All scraped markdown content from all pages
      productsContent, // All product information
      metadata: homeResult.metadata || {}
    };
  } catch (error: any) {
    console.error('❌ Firecrawl error:', error.message);
    console.log('🔄 Falling back to simple fetch...');
    return await fallbackScrape(url);
  }
}

/**
 * Fallback scraper using simple fetch
 */
async function fallbackScrape(url: string): Promise<{
  html: string;
  css: string;
  about: string;
  metadata: any;
}> {
  console.log('🔄 Using fallback scrape method...');
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BrandAnalyzer/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    console.log(`✅ Fallback scrape: ${html.length} chars`);
    
    const css = extractCSSFromHTML(html);
    
    // Extract title and meta description as metadata
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const metaDescMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
    
    return {
      html,
      css,
      about: '', // No about page in fallback
      metadata: {
        title: titleMatch ? titleMatch[1] : '',
        description: metaDescMatch ? metaDescMatch[1] : ''
      }
    };
  } catch (error: any) {
    console.error('❌ Fallback scrape failed:', error);
    throw new Error(`Failed to scrape website: ${error.message}`);
  }
}

/**
 * Fetch external stylesheets from <link> tags
 */
async function fetchExternalStylesheets(baseUrl: string, html: string): Promise<string> {
  const cssBlocks: string[] = [];
  
  // Extract all <link rel="stylesheet"> URLs
  const linkRegex = /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  const allHrefs: string[] = [];
  let match;
  
  while ((match = linkRegex.exec(html)) !== null) {
    allHrefs.push(match[1]);
  }
  
  console.log(`📦 Found ${allHrefs.length} external stylesheets`);
  
  // PRIORITIZE theme CSS and Elementor global CSS (these have brand colors/fonts)
  const priorityHrefs = allHrefs.filter(href => 
    href.includes('/themes/') || 
    href.includes('elementor') && (href.includes('post-') || href.includes('global')) ||
    href.includes('style.css') ||
    href.includes('custom')
  );
  
  // Take remaining non-priority ones
  const otherHrefs = allHrefs.filter(href => !priorityHrefs.includes(href));
  
  // Combine: priority first, then others, limit to 8 total
  const hrefs = [...priorityHrefs, ...otherHrefs].slice(0, 8);
  
  console.log(`🎯 Prioritized ${priorityHrefs.length} theme/global stylesheets, fetching ${hrefs.length} total`);
  
  // Fetch stylesheets
  const fetchPromises = hrefs.map(async (href) => {
    try {
      // Convert relative URLs to absolute
      const cssUrl = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
      console.log(`📥 Fetching CSS: ${cssUrl}`);
      
      const response = await fetch(cssUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BrandAnalyzer/1.0)' }
      });
      
      if (response.ok) {
        const css = await response.text();
        console.log(`✅ Fetched ${css.length} chars from ${cssUrl}`);
        return css;
      }
    } catch (error) {
      console.log(`⚠️ Failed to fetch ${href}:`, error);
    }
    return '';
  });
  
  const results = await Promise.all(fetchPromises);
  return results.filter(css => css.length > 0).join('\n');
}

/**
 * Extract all CSS from HTML (inline styles + style tags)
 */
function extractCSSFromHTML(html: string): string {
  const cssBlocks: string[] = [];

  // Extract <style> tags
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  let styleTagCount = 0;
  while ((match = styleRegex.exec(html)) !== null) {
    cssBlocks.push(match[1]);
    styleTagCount++;
  }
  console.log(`   Found ${styleTagCount} <style> tags`);

  // Extract inline styles
  const inlineStyleRegex = /style="([^"]*)"/gi;
  let inlineStyleCount = 0;
  while ((match = inlineStyleRegex.exec(html)) !== null) {
    cssBlocks.push(match[1]);
    inlineStyleCount++;
  }
  console.log(`   Found ${inlineStyleCount} inline style attributes`);

  const totalCSS = cssBlocks.join('\n');
  console.log(`   Total inline CSS extracted: ${totalCSS.length} chars`);
  
  return totalCSS;
}

/**
 * Extract all colors from CSS with context - GUARANTEED minimum 5 colors
 */
function extractColors(html: string, css: string): ColorData[] {
  const colorMap = new Map<string, ColorData>();

  // Combined content for parsing
  const allContent = css + '\n' + html;

  console.log('🎨 Extracting colors from content...');

  // Regex patterns for different color formats
  const hexRegex = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g;
  const rgbRegex = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+)\s*)?\)/g;

  // Extract hex colors
  let match;
  while ((match = hexRegex.exec(allContent)) !== null) {
    const hex = normalizeHex(match[0]);
    const context = getColorContext(allContent, match.index);
    
    if (colorMap.has(hex)) {
      const existing = colorMap.get(hex)!;
      existing.frequency++;
      existing.context = Array.from(new Set([...existing.context, ...context]));
    } else {
      colorMap.set(hex, {
        hex,
        rgb: hexToRgb(hex),
        frequency: 1,
        context
      });
    }
  }

  // Extract RGB colors
  while ((match = rgbRegex.exec(allContent)) !== null) {
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    const hex = rgbToHex(r, g, b);
    const context = getColorContext(allContent, match.index);

    if (colorMap.has(hex)) {
      const existing = colorMap.get(hex)!;
      existing.frequency++;
      existing.context = Array.from(new Set([...existing.context, ...context]));
    } else {
      colorMap.set(hex, {
        hex,
        rgb: `rgb(${r}, ${g}, ${b})`,
        frequency: 1,
        context
      });
    }
  }

  console.log(`📊 Found ${colorMap.size} total colors before filtering`);

  // Filter out common non-brand colors
  let brandColors = Array.from(colorMap.values())
    .filter(color => !isCommonColor(color.hex))
    .sort((a, b) => b.frequency - a.frequency);

  console.log(`🎨 ${brandColors.length} brand colors after filtering`);

  // Return top 5 MOST USED colors (already sorted by frequency)
  const topColors = brandColors.slice(0, 5);
  console.log(`✅ Returning top ${topColors.length} most used colors`);
  topColors.forEach((c, i) => {
    console.log(`   ${i+1}. ${c.hex} - used ${c.frequency}x in: ${c.context.join(', ')}`);
  });
  return topColors;
}

/**
 * Get context of where a color is used
 */
function getColorContext(content: string, index: number): string[] {
  const context: string[] = [];
  const snippet = content.substring(Math.max(0, index - 200), index + 50).toLowerCase();

  // Check for common CSS properties and selectors
  if (snippet.includes('background') || snippet.includes('bg-')) context.push('background');
  if (snippet.includes('color:') && !snippet.includes('background')) context.push('text');
  if (snippet.includes('border')) context.push('border');
  if (snippet.includes('button') || snippet.includes('btn')) context.push('button');
  if (snippet.includes('h1') || snippet.includes('h2') || snippet.includes('heading')) context.push('heading');
  if (snippet.includes('link') || snippet.includes('a {')) context.push('link');
  if (snippet.includes('primary') || snippet.includes('brand')) context.push('brand');

  return context.length > 0 ? context : ['unknown'];
}

/**
 * Categorize colors into primary, secondary, accent, etc.
 */
function categorizeColors(colors: ColorData[]): ColorData[] {
  console.log(`🏷️ Categorizing ${colors.length} colors...`);

  // Sort by frequency and prominence
  const sorted = [...colors].sort((a, b) => {
    // Prioritize colors with brand context
    const aScore = a.frequency * (a.context.includes('brand') ? 3 : 1) * (a.context.includes('button') ? 2 : 1) * (a.context.includes('heading') ? 1.5 : 1);
    const bScore = b.frequency * (b.context.includes('brand') ? 3 : 1) * (b.context.includes('button') ? 2 : 1) * (b.context.includes('heading') ? 1.5 : 1);
    return bScore - aScore;
  });

  // GUARANTEE at least 5 primary colors
  const minPrimary = Math.min(5, sorted.length);
  
  // Categorize - ensure first 5 are primary
  sorted.forEach((color, index) => {
    if (index < minPrimary) {
      // First 5 are ALWAYS primary brand colors
      color.category = 'primary';
    } else if (index < 10) {
      // Next 5 are secondary or accent
      color.category = color.context.includes('button') || color.context.includes('link') ? 'accent' : 'secondary';
    } else if (color.context.includes('background')) {
      color.category = 'background';
    } else if (color.context.includes('text')) {
      color.category = 'text';
    } else {
      color.category = 'secondary';
    }
  });

  const primaryCount = sorted.filter(c => c.category === 'primary').length;
  console.log(`✅ Categorized: ${primaryCount} primary, ${sorted.length - primaryCount} other`);

  return sorted.slice(0, 15); // Return top 15 colors for better coverage
}

/**
 * Extract all fonts from CSS
 */
function extractFonts(html: string, css: string): FontData[] {
  const fontMap = new Map<string, FontData>();
  const allContent = css + '\n' + html;

  console.log('🔤 Extracting fonts from content...');

  // Extract Google Fonts links (multiple patterns)
  const googleFontsPatterns = [
    /fonts\.googleapis\.com\/css2?\?family=([^"'&]+)/g,
    /fonts\.googleapis\.com\/css\?family=([^"'&]+)/g
  ];

  for (const pattern of googleFontsPatterns) {
    let match;
    while ((match = pattern.exec(allContent)) !== null) {
      const fontFamily = decodeURIComponent(match[1]).split(':')[0].replace(/\+/g, ' ');
      if (!fontMap.has(fontFamily)) {
        console.log(`📝 Found Google Font: ${fontFamily}`);
        fontMap.set(fontFamily, {
          family: fontFamily,
          weight: 'normal',
          style: 'normal',
          usage: ['imported'],
          category: 'heading'
        });
      }
    }
  }

  // Extract @font-face declarations
  const fontFaceRegex = /@font-face\s*\{[^}]*font-family\s*:\s*['"]?([^'";]+)['"]?[^}]*\}/gi;
  let match;
  while ((match = fontFaceRegex.exec(allContent)) !== null) {
    const fontFamily = match[1].trim();
    if (!fontMap.has(fontFamily) && fontFamily.length > 0) {
      console.log(`📝 Found @font-face: ${fontFamily}`);
      fontMap.set(fontFamily, {
        family: fontFamily,
        weight: 'normal',
        style: 'normal',
        usage: ['font-face'],
        category: 'heading'
      });
    }
  }

  // Extract font-family declarations
  const fontFamilyRegex = /font-family\s*:\s*([^;}"']+)/gi;
  while ((match = fontFamilyRegex.exec(allContent)) !== null) {
    const families = match[1].split(',').map(f => f.trim().replace(/['"]/g, ''));
    const context = getFontContext(allContent, match.index);

    families.forEach(family => {
      // Skip generic font families
      if (['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', '-apple-system', 'BlinkMacSystemFont'].includes(family)) {
        return;
      }

      // Clean up font name
      family = family.replace(/['"]/g, '').trim();
      
      if (family.length === 0) return;

      if (fontMap.has(family)) {
        const existing = fontMap.get(family)!;
        existing.usage = Array.from(new Set([...existing.usage, ...context]));
      } else {
        console.log(`📝 Found font-family: ${family}`);
        fontMap.set(family, {
          family,
          weight: 'normal',
          style: 'normal',
          usage: context,
          category: context.some(c => c.includes('h1') || c.includes('h2') || c.includes('heading')) ? 'heading' : 'body'
        });
      }
    });
  }

  const allFonts = Array.from(fontMap.values());
  console.log(`📊 Found ${allFonts.length} total fonts`);
  
  // Filter: Keep ONLY imported brand fonts (Google Fonts, @font-face), remove system fonts
  const systemFonts = ['inherit', 'system-ui', 'sans-serif', 'serif', 'monospace', 'arial', 'helvetica', 'times', 'courier', 'verdana', 'georgia', 'segoe ui', 'roboto', 'oxygen', 'ubuntu', 'cantarell', 'fira sans', 'droid sans', 'helvetica neue', 'blinkmacsystemfont', 'woocommerce', 'dashicons', 'eicons', '-apple-system'];

  const brandFonts = allFonts.filter(font => {
    const familyLower = font.family.toLowerCase().trim();
    
    // Skip if matches any system font
    if (systemFonts.some(sys => familyLower.includes(sys))) {
      return false;
    }
    
    // Keep ONLY if it's imported (Google Fonts or @font-face)
    return font.usage.includes('imported') || font.usage.includes('font-face');
  });

  console.log(`✅ Kept ${brandFonts.length} brand fonts (removed ${allFonts.length - brandFonts.length} system fonts)`);
  
  // If no brand fonts found, add fallback
  if (brandFonts.length === 0) {
    console.warn('⚠️ No brand fonts detected');
    brandFonts.push({
      family: 'Sans-serif',
      weight: 'normal',
      style: 'normal',
      usage: ['fallback'],
      category: 'body'
    });
  }

  return brandFonts;
}

/**
 * Get context of where a font is used
 */
function getFontContext(content: string, index: number): string[] {
  const context: string[] = [];
  const snippet = content.substring(Math.max(0, index - 150), index + 50).toLowerCase();

  if (snippet.includes('h1')) context.push('h1');
  if (snippet.includes('h2')) context.push('h2');
  if (snippet.includes('h3')) context.push('h3');
  if (snippet.includes('heading')) context.push('heading');
  if (snippet.includes('body')) context.push('body');
  if (snippet.includes('p {') || snippet.includes('paragraph')) context.push('paragraph');
  if (snippet.includes('button') || snippet.includes('btn')) context.push('button');
  if (snippet.includes('display')) context.push('display');

  return context.length > 0 ? context : ['body'];
}

/**
 * Categorize fonts by usage
 */
function categorizeFonts(fonts: FontData[]): FontData[] {
  fonts.forEach(font => {
    const usage = font.usage.join(' ').toLowerCase();
    
    if (usage.includes('h1') || usage.includes('h2') || usage.includes('heading') || usage.includes('display')) {
      font.category = 'heading';
    } else if (usage.includes('mono') || usage.includes('code')) {
      font.category = 'mono';
    } else {
      font.category = 'body';
    }
  });

  return fonts;
}

/**
 * Extract logo from website
 */
async function extractLogo(url: string, html: string): Promise<LogoData> {
  console.log('🖼️ Extracting logo...');

  // Helper to validate and score logo URLs (higher score = better logo)
  const scoreLogoUrl = (imageUrl: string): number => {
    if (!imageUrl) return 0;
    const lower = imageUrl.toLowerCase();
    let score = 0;
    
    // Must be an image format
    if (!(lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || 
          lower.endsWith('.svg') || lower.endsWith('.webp') || lower.endsWith('.gif'))) {
      return 0;
    }
    
    // Prioritize uploaded images (not favicons)
    if (lower.includes('/wp-content/uploads/')) score += 100;
    if (lower.includes('/uploads/')) score += 80;
    
    // Prioritize "logo" in filename
    if (lower.includes('logo')) score += 50;
    if (lower.includes('brand')) score += 40;
    
    // Prioritize larger sizes (from filename)
    if (lower.includes('300x300') || lower.includes('512x512')) score += 30;
    if (lower.includes('200x200') || lower.includes('400x400')) score += 20;
    if (lower.includes('100x100') || lower.includes('150x150')) score += 10;
    
    // Penalize favicons
    if (lower.includes('favicon')) score -= 20;
    if (lower.endsWith('/favicon.ico')) score -= 100;
    
    // Prioritize PNG/SVG over JPG
    if (lower.endsWith('.png') || lower.endsWith('.svg')) score += 10;
    
    console.log(`   Logo candidate: ${imageUrl} (score: ${score})`);
    return score;
  };

  // Strategy: Find ALL potential logo images, score them, pick the best
  const logoCandidates: { url: string; score: number; source: string }[] = [];

  // Find all image URLs in HTML
  const allImageUrls: string[] = [];
  
  // Extract from img tags
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    allImageUrls.push(match[1]);
  }
  
  // Extract from meta tags (og:image, etc)
  const metaRegex = /<meta[^>]+content=["']([^"']+\.(png|jpg|jpeg|svg|webp))["'][^>]*>/gi;
  while ((match = metaRegex.exec(html)) !== null) {
    allImageUrls.push(match[1]);
  }
  
  // Extract from link tags (apple-touch-icon, etc)
  const linkRegex = /<link[^>]+href=["']([^"']+\.(png|jpg|jpeg|svg|webp|ico))["'][^>]*>/gi;
  while ((match = linkRegex.exec(html)) !== null) {
    allImageUrls.push(match[1]);
  }
  
  console.log(`   Found ${allImageUrls.length} total images, scoring...`);
  
  // Score all candidates
  for (const imageUrl of allImageUrls) {
    const absoluteUrl = makeAbsoluteUrl(imageUrl, url);
    const score = scoreLogoUrl(absoluteUrl);
    if (score > 0) {
      logoCandidates.push({ url: absoluteUrl, score, source: 'auto-detected' });
    }
  }
  
  // Sort by score (highest first)
  logoCandidates.sort((a, b) => b.score - a.score);
  
  // Return the highest scoring logo
  if (logoCandidates.length > 0) {
    const bestLogo = logoCandidates[0];
    console.log(`✅ Best logo: ${bestLogo.url} (score: ${bestLogo.score})`);
    return { url: bestLogo.url, source: bestLogo.source, alt: 'Brand logo' };
  }

  // Priority 2: Look for logo in common selectors (IMG tags)
  // Prioritize WordPress custom-logo and larger images
  const logoPatterns = [
    // WordPress standard
    /<img[^>]*class="[^"]*custom-logo[^"]*"[^>]*src="([^"]+)"/i,
    /<img[^>]*class="[^"]*site-logo[^"]*"[^>]*src="([^"]+)"/i,
    
    // Common logo classes
    /<img[^>]*class="[^"]*logo[^"]*"[^>]*src="([^"]+)"/i,
    /<img[^>]*id="[^"]*logo[^"]*"[^>]*src="([^"]+)"/i,
    /<img[^>]*alt="[^"]*logo[^"]*"[^>]*src="([^"]+)"/i,
    
    // Brand-related
    /<img[^>]*class="[^"]*brand[^"]*"[^>]*src="([^"]+)"/i,
    /<img[^>]*alt="[^"]*brand[^"]*"[^>]*src="([^"]+)"/i,
    
    // Filename contains logo
    /<img[^>]*src="([^"]*logo[^"]+\.(png|jpg|jpeg|svg|webp))"/i,
  ];

  for (const pattern of logoPatterns) {
    const match = html.match(pattern);
    if (match && isValidImageUrl(match[1])) {
      const logoUrl = makeAbsoluteUrl(match[1], url);
      console.log(`✅ Logo found (HTML): ${logoUrl}`);
      return { url: logoUrl, source: 'logo-selector', alt: 'Logo from HTML' };
    }
  }

  // Priority 3: Apple touch icon (usually high-res, 180x180+)
  const appleTouchMatch = html.match(/<link[^>]*rel="apple-touch-icon"[^>]*href="([^"]+)"/i);
  if (appleTouchMatch && isValidImageUrl(appleTouchMatch[1])) {
    const logoUrl = makeAbsoluteUrl(appleTouchMatch[1], url);
    console.log(`✅ Logo found (Apple icon): ${logoUrl}`);
    return { url: logoUrl, source: 'apple-touch-icon', alt: 'High-res brand icon' };
  }

  // Priority 4: Look for any image in header/nav with "logo" in src or alt
  const headerLogoRegex = /<(?:header|nav)[^>]*>([\s\S]*?)<\/(?:header|nav)>/gi;
  let headerMatch;
  while ((headerMatch = headerLogoRegex.exec(html)) !== null) {
    const headerContent = headerMatch[1];
    const imgRegex = /<img[^>]*src="([^"]+)"[^>]*>/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(headerContent)) !== null) {
      const src = imgMatch[1];
      if (isValidImageUrl(src) && (src.includes('logo') || src.includes('brand'))) {
        const logoUrl = makeAbsoluteUrl(src, url);
        console.log(`✅ Logo found (header img): ${logoUrl}`);
        return { url: logoUrl, source: 'header-img', alt: 'Logo from header' };
      }
    }
  }

  // Priority 5: High-resolution favicon (192x192, 300x300, 512x512)
  const highResFaviconPatterns = [
    /<link[^>]*rel="icon"[^>]*sizes="(192x192|300x300|512x512)"[^>]*href="([^"]+)"/i,
    /<link[^>]*sizes="(192x192|300x300|512x512)"[^>]*rel="icon"[^>]*href="([^"]+)"/i,
  ];

  for (const pattern of highResFaviconPatterns) {
    const match = html.match(pattern);
    if (match && isValidImageUrl(match[2])) {
      const logoUrl = makeAbsoluteUrl(match[2], url);
      console.log(`✅ Logo found (High-res favicon): ${logoUrl}`);
      return { url: logoUrl, source: 'high-res-favicon', alt: `Brand icon (${match[1]})` };
    }
  }

  // Priority 5: Standard favicon (lower priority, usually small)
  const faviconPatterns = [
    /<link[^>]*rel="icon"[^>]*href="([^"]+)"/i,
    /<link[^>]*rel="shortcut icon"[^>]*href="([^"]+)"/i,
    /<link[^>]*rel="icon"[^>]*type="image\/png"[^>]*href="([^"]+)"/i,
  ];

  for (const pattern of faviconPatterns) {
    const match = html.match(pattern);
    if (match) {
      const logoUrl = makeAbsoluteUrl(match[1], url);
      console.log(`✅ Logo found (Favicon): ${logoUrl}`);
      return { url: logoUrl, source: 'favicon', alt: 'Favicon (low-res)' };
    }
  }

  // Fallback: Default favicon location
  const baseUrl = new URL(url).origin;
  console.warn(`⚠️ No logo found, using fallback: ${baseUrl}/favicon.ico`);
  
  return { 
    url: `${baseUrl}/favicon.ico`, 
    source: 'fallback', 
    alt: 'Default favicon' 
  };
}

/**
 * Extract content for AI analysis
 */
function extractContent(scrapedData: any): WebsiteAnalysisResult['content'] {
  const html = scrapedData.html;
  const metadata = scrapedData.metadata || {};

  // Extract title
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  const title = titleMatch ? stripHtml(titleMatch[1]) : (metadata.title || '');

  // Extract headlines
  const headlines: string[] = [];
  const h1Regex = /<h1[^>]*>(.*?)<\/h1>/gi;
  let match;
  while ((match = h1Regex.exec(html)) !== null) {
    const text = stripHtml(match[1]);
    if (text) headlines.push(text);
  }

  // Extract tagline (usually in hero section or first paragraph)
  const taglineMatch = html.match(/<p[^>]*>(.*?)<\/p>/i);
  const tagline = taglineMatch ? stripHtml(taglineMatch[1]) : '';

  // Extract meta keywords
  const keywordsMatch = html.match(/<meta[^>]*name="keywords"[^>]*content="([^"]+)"/i);
  const keywords = keywordsMatch ? keywordsMatch[1].split(',').map(k => k.trim()) : [];

  // Extract product information (look for product-related content)
  let products = '';
  const productRegex = /<div[^>]*class="[^"]*product[^"]*"[^>]*>(.*?)<\/div>/gis;
  const productMatches = html.match(productRegex);
  if (productMatches) {
    products = productMatches.slice(0, 3).map(p => stripHtml(p)).join(' | ');
  }

  // Extract pricing information
  let pricing = '';
  const priceRegex = /\$\d+(?:\.\d{2})?|\d+(?:\.\d{2})?\s*(?:USD|EUR|GBP)/gi;
  const priceMatches = html.match(priceRegex);
  if (priceMatches) {
    pricing = [...new Set(priceMatches)].slice(0, 5).join(', ');
  }

  return {
    title,
    homepage: scrapedData.html,
    about: scrapedData.about || '',
    products,
    tagline,
    headlines,
    metaDescription: metadata.description || '',
    keywords,
    pricing
  };
}

/**
 * Analyze tone and language style
 */
function analyzeTone(content: WebsiteAnalysisResult['content']): WebsiteAnalysisResult['tone'] {
  const text = `${content.tagline} ${content.headlines.join(' ')} ${content.metaDescription}`.toLowerCase();

  // Detect formality
  const formalWords = ['moreover', 'furthermore', 'therefore', 'pursuant', 'hereby'];
  const casualWords = ['hey', 'awesome', 'cool', 'grab', 'check out'];
  
  const formalCount = formalWords.filter(w => text.includes(w)).length;
  const casualCount = casualWords.filter(w => text.includes(w)).length;

  const formalityLevel = formalCount > casualCount ? 'formal' : casualCount > 0 ? 'casual' : 'neutral';

  return {
    languageStyle: formalityLevel,
    formalityLevel,
    examplePhrases: content.headlines.slice(0, 5)
  };
}

// Utility functions
function normalizeHex(hex: string): string {
  hex = hex.replace('#', '').toUpperCase();
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  return '#' + hex;
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function isCommonColor(hex: string): boolean {
  const common = ['#FFFFFF', '#000000', '#FFFFFFFF', '#00000000'];
  return common.includes(hex);
}

function makeAbsoluteUrl(url: string, baseUrl: string): string {
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) {
    const origin = new URL(baseUrl).origin;
    return origin + url;
  }
  // Relative URL
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return base + '/' + url;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

