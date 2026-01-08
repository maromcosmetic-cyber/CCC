import FirecrawlApp from '@mendable/firecrawl-js';

const apiKey = process.env.FIRECRAWL_API_KEY;

if (!apiKey) {
    console.warn("Missing FIRECRAWL_API_KEY environment variable.");
}

export const firecrawl = new FirecrawlApp({
    apiKey: apiKey || 'fc-placeholder'
});
