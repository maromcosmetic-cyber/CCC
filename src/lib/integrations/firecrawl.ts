import FirecrawlApp from '@mendable/firecrawl-js';

const apiKey = process.env.FIRECRAWL_API_KEY;

if (!apiKey) {
    console.warn("⚠️ FIRECRAWL_API_KEY is not set. Competitor research will fail.");
}

const app = new FirecrawlApp({ apiKey: apiKey || 'fc-dummy-key' });

export interface CompetitorData {
    url: string;
    content: string;
    title?: string;
    description?: string;
}

export const firecrawl = {
    /**
     * Scrape a single URL to get its main content
     */
    async scrapeUrl(url: string): Promise<CompetitorData | null> {
        try {
            console.log(`🔥 Firecrawl: Scraping ${url}...`);
            // @ts-ignore
            const scrapeResult = await app.scrapeUrl(url, {
                formats: ['markdown'],
            });

            if (!scrapeResult.success) {
                throw new Error(`Firecrawl failed: ${JSON.stringify(scrapeResult.error)}`);
            }

            return {
                url,
                content: scrapeResult.markdown || '',
                title: scrapeResult.metadata?.title,
                description: scrapeResult.metadata?.description,
            };
        } catch (error) {
            console.error("Firecrawl Scrape Error:", error);
            return null;
        }
    },

    /**
     * Search Google for competitors
     */
    async searchGoogle(query: string, limit = 5): Promise<any[]> {
        try {
            console.log(`🔥 Firecrawl: Searching for "${query}"...`);

            // @ts-ignore
            const searchResult: any = await app.search(query, {
                limit: limit
            });

            console.log("🔥 Firecrawl Raw Result:", JSON.stringify(searchResult, null, 2));

            // Handle { success: true, data: [...] }
            if (searchResult.data && Array.isArray(searchResult.data)) {
                return searchResult.data;
            }

            // Handle direct array
            if (Array.isArray(searchResult)) {
                return searchResult;
            }

            // Handle { success: false }
            if (searchResult.success === false) {
                console.warn("Firecrawl search failed:", searchResult);
                return [];
            }

            return [];
        } catch (error) {
            console.error("Firecrawl Search Error:", error);
            return [];
        }
    }
};
