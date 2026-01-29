/**
 * Competitor Multi-Page Scraper
 * Scrapes multiple pages from competitor websites for deep analysis
 */

import { firecrawl } from '@/lib/firecrawl';

export interface ScrapedCompetitorData {
    url: string;
    homepage: string;
    about: string;
    products: string;
    pricing: string;
    blog: string[];
    metadata: {
        title: string;
        description: string;
        ogImage?: string;
    };
}

/**
 * Scrape multiple pages from a competitor website
 */
export async function scrapeCompetitorWebsite(baseUrl: string): Promise<ScrapedCompetitorData> {
    const normalizedUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
    
    const data: ScrapedCompetitorData = {
        url: normalizedUrl,
        homepage: '',
        about: '',
        products: '',
        pricing: '',
        blog: [],
        metadata: {
            title: '',
            description: ''
        }
    };

    try {
        // 1. Scrape Homepage
        console.log(`Scraping homepage: ${normalizedUrl}`);
        const homeResult = await firecrawl.scrape(normalizedUrl, {
            formats: ['markdown'],
        });
        data.homepage = homeResult.markdown || '';
        data.metadata = {
            title: homeResult.metadata?.title || '',
            description: homeResult.metadata?.description || '',
            ogImage: homeResult.metadata?.ogImage
        };
    } catch (error) {
        console.error('Failed to scrape homepage:', error);
    }

    // 2. Try common page patterns
    const pagesToTry = [
        { key: 'about', paths: ['/about', '/about-us', '/company', '/our-story'] },
        { key: 'products', paths: ['/products', '/shop', '/store', '/solutions'] },
        { key: 'pricing', paths: ['/pricing', '/plans', '/buy'] }
    ];

    for (const page of pagesToTry) {
        for (const path of page.paths) {
            try {
                const fullUrl = `${normalizedUrl}${path}`;
                console.log(`Trying: ${fullUrl}`);
                const result = await firecrawl.scrape(fullUrl, {
                    formats: ['markdown'],
                });
                if (result.markdown && result.markdown.length > 100) {
                    data[page.key as keyof typeof data] = result.markdown;
                    console.log(`✓ Found ${page.key} at ${path}`);
                    break;
                }
            } catch (error) {
                // Page doesn't exist, continue
                continue;
            }
        }
    }

    return data;
}

/**
 * Scrape multiple competitor websites with progress tracking
 */
export async function scrapeMultipleCompetitors(
    competitors: Array<{ url: string; title: string }>,
    onProgress?: (current: number, total: number, url: string, status: 'scraping' | 'success' | 'failed') => void
): Promise<Array<{ url: string; title: string; data: ScrapedCompetitorData | null; error?: string }>> {
    const results: Array<{ url: string; title: string; data: ScrapedCompetitorData | null; error?: string }> = [];
    
    for (let i = 0; i < competitors.length; i++) {
        const competitor = competitors[i];
        
        if (onProgress) {
            onProgress(i + 1, competitors.length, competitor.url, 'scraping');
        }

        try {
            console.log(`[${i + 1}/${competitors.length}] Scraping: ${competitor.url}`);
            const data = await scrapeCompetitorWebsite(competitor.url);
            results.push({
                url: competitor.url,
                title: competitor.title,
                data,
                error: undefined
            });
            
            if (onProgress) {
                onProgress(i + 1, competitors.length, competitor.url, 'success');
            }
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
            console.error(`Failed to scrape ${competitor.url}:`, error.message);
            results.push({
                url: competitor.url,
                title: competitor.title,
                data: null,
                error: error.message || 'Scraping failed'
            });
            
            if (onProgress) {
                onProgress(i + 1, competitors.length, competitor.url, 'failed');
            }
        }
    }

    return results;
}

/**
 * Scrape Google Reviews (placeholder - would need actual Google API)
 */
export async function scrapeReviews(businessName: string, location?: string): Promise<{
    reviews: Array<{
        rating: number;
        text: string;
        author: string;
        date: string;
    }>;
    averageRating: number;
    totalReviews: number;
}> {
    // Placeholder implementation
    // In production, this would use Google Places API or review scraping service
    return {
        reviews: [],
        averageRating: 0,
        totalReviews: 0
    };
}

/**
 * Check social media presence
 */
export async function checkSocialPresence(brandName: string): Promise<{
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    tiktok?: string;
}> {
    // Placeholder implementation
    // In production, this would search for social profiles
    return {};
}

/**
 * Extract all images/videos from scraped content
 */
export function extractMediaUrls(markdown: string): {
    images: string[];
    videos: string[];
} {
    const images: string[] = [];
    const videos: string[] = [];

    // Extract markdown images: ![alt](url)
    const imageRegex = /!\[.*?\]\((.*?)\)/g;
    let match;
    while ((match = imageRegex.exec(markdown)) !== null) {
        images.push(match[1]);
    }

    // Extract HTML images
    const htmlImageRegex = /<img[^>]+src="([^">]+)"/g;
    while ((match = htmlImageRegex.exec(markdown)) !== null) {
        images.push(match[1]);
    }

    // Videos would be extracted similarly
    // This is a simplified version

    return { images, videos };
}

/**
 * Truncate content for AI processing
 */
export function truncateForAI(content: string, maxLength: number = 15000): string {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '\n\n[Content truncated...]';
}

