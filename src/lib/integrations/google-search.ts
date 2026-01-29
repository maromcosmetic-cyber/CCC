/**
 * Google Custom Search API Integration
 * Discovers competitor websites based on brand identity
 */

export interface CompetitorCandidate {
  url: string;
  title: string;
  snippet: string;
  displayUrl: string;
  relevanceScore: number;
}

interface GoogleSearchResult {
  items?: Array<{
    link: string;
    title: string;
    snippet: string;
    displayLink: string;
  }>;
}

/**
 * Find competitor websites using Google Custom Search API
 */
export async function findCompetitors(
  userWebsite: string,
  brandIdentity?: any
): Promise<CompetitorCandidate[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    throw new Error('Google Search API credentials not configured');
  }

  // Extract user's domain to exclude from results
  const userDomain = new URL(userWebsite).hostname.replace('www.', '');

  // Construct search queries based on brand identity
  const queries = constructSearchQueries(brandIdentity, userDomain);

  console.log('🔍 Searching Google with queries:', queries);

  const allCandidates: CompetitorCandidate[] = [];
  const seenUrls = new Set<string>();

  // Execute multiple searches to get diverse results
  for (const query of queries.slice(0, 3)) { // Limit to 3 queries to avoid quota issues
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=10`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`Google Search API error: ${response.status}`, await response.text());
        continue;
      }

      const data: GoogleSearchResult = await response.json();

      if (data.items) {
        for (const item of data.items) {
          const domain = new URL(item.link).hostname.replace('www.', '');
          
          // Skip user's own domain and duplicates
          if (domain === userDomain || seenUrls.has(domain)) {
            continue;
          }

          // Filter out non-commercial sites
          if (isValidCompetitor(item.link)) {
            allCandidates.push({
              url: item.link,
              title: item.title,
              snippet: item.snippet,
              displayUrl: item.displayLink,
              relevanceScore: calculateRelevanceScore(item, query)
            });
            seenUrls.add(domain);
          }
        }
      }
    } catch (error) {
      console.error('Error searching with query:', query, error);
    }
  }

  // Sort by relevance and return top 10
  const topCompetitors = allCandidates
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 10);

  console.log(`✅ Found ${topCompetitors.length} competitors`);

  return topCompetitors;
}

/**
 * Construct search queries from brand identity - READS YOUR PLAYBOOK DATA
 */
function constructSearchQueries(brandIdentity: any, excludeDomain: string): string[] {
  const queries: string[] = [];

  console.log('🧠 Building search queries from brand identity:', {
    dna: brandIdentity?.dna,
    product: brandIdentity?.product,
    positioning: brandIdentity?.positioning,
    audience: brandIdentity?.audience
  });

  // Extract ACTUAL fields from your brand identity
  const brandName = brandIdentity?.dna?.name || '';
  const productName = brandIdentity?.product?.name || '';
  const productCategory = brandIdentity?.product?.category || '';
  const mainBenefits = brandIdentity?.product?.main_benefits || '';
  const uniqueFeatures = brandIdentity?.product?.unique_features || '';
  const marketCategory = brandIdentity?.positioning?.market_category || '';
  const subCategory = brandIdentity?.positioning?.sub_category || '';
  const targetAudience = brandIdentity?.audience?.ideal_customer || '';
  const problemSolved = brandIdentity?.dna?.problem_solved || '';
  
  // Extract key terms from text fields
  const extractKeyTerms = (text: string): string[] => {
    if (!text) return [];
    // Extract meaningful words (skip common words)
    const stopWords = ['the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'our'];
    return text.toLowerCase()
      .split(/[\s,;.]+/)
      .filter(word => word.length > 3 && !stopWords.includes(word))
      .slice(0, 3);
  };

  const benefitKeywords = extractKeyTerms(mainBenefits);
  const featureKeywords = extractKeyTerms(uniqueFeatures);
  
  console.log('📊 Extracted keywords:', {
    productCategory,
    marketCategory,
    subCategory,
    benefitKeywords,
    featureKeywords
  });

  // Query 1: Product category + sub-category (MOST SPECIFIC)
  if (productCategory && subCategory) {
    queries.push(`${productCategory} ${subCategory} brands online store -site:${excludeDomain} -site:amazon.com -site:walmart.com -site:target.com -site:ebay.com`);
  }

  // Query 2: Market category + product name
  if (marketCategory && productName) {
    queries.push(`${marketCategory} ${productName} brands buy -site:${excludeDomain} -site:amazon.com -site:walmart.com`);
  }

  // Query 3: Product category + key benefits (find brands solving same problem)
  if (productCategory && benefitKeywords.length > 0) {
    queries.push(`${productCategory} ${benefitKeywords.slice(0, 2).join(' ')} brands -site:${excludeDomain} -site:amazon.com`);
  }

  // Query 4: Unique features + category (find similar innovation)
  if (featureKeywords.length > 0 && productCategory) {
    queries.push(`${featureKeywords[0]} ${productCategory} brands -site:${excludeDomain} -site:amazon.com -site:walmart.com`);
  }

  // Query 5: Sub-category only (broader search)
  if (subCategory) {
    queries.push(`${subCategory} brands online shop -site:${excludeDomain} -site:amazon.com -site:ebay.com -site:walmart.com -site:target.com`);
  }

  // Query 6: Market category + problem solved
  if (marketCategory && problemSolved) {
    const problemKeywords = extractKeyTerms(problemSolved);
    if (problemKeywords.length > 0) {
      queries.push(`${marketCategory} ${problemKeywords[0]} solution brands -site:${excludeDomain} -site:amazon.com`);
    }
  }

  // Query 7: Brand name alternatives (find direct competitors)
  if (brandName) {
    queries.push(`"${brandName}" alternatives competitors -site:${excludeDomain} -site:reddit.com -site:quora.com`);
  }

  // Fallback: Extract from domain name
  if (queries.length === 0) {
    const domainParts = excludeDomain.split('.')[0];
    queries.push(`${domainParts} alternatives buy online -site:${excludeDomain}`);
    queries.push(`${domainParts} competitors brands -site:${excludeDomain}`);
  }

  console.log('✅ Generated search queries:', queries.slice(0, 5));

  return queries;
}

/**
 * Calculate relevance score for a search result
 */
function calculateRelevanceScore(item: any, query: string): number {
  let score = 0;

  // Title contains query terms
  const queryTerms = query.toLowerCase().split(' ').filter(t => t.length > 3);
  const titleLower = item.title.toLowerCase();
  const snippetLower = item.snippet.toLowerCase();

  queryTerms.forEach(term => {
    if (titleLower.includes(term)) score += 2;
    if (snippetLower.includes(term)) score += 1;
  });

  // Prefer .com, .co, .shop domains
  if (item.link.includes('.com') || item.link.includes('.co') || item.link.includes('.shop')) {
    score += 1;
  }

  // Boost if snippet mentions "shop", "buy", "store", "products"
  const commercialTerms = ['shop', 'buy', 'store', 'products', 'purchase', 'order'];
  commercialTerms.forEach(term => {
    if (snippetLower.includes(term)) score += 0.5;
  });

  return score;
}

/**
 * Check if URL is a valid competitor (filter out non-commercial sites)
 */
function isValidCompetitor(url: string): boolean {
  const invalidDomains = [
    // Marketplaces
    'amazon.com',
    'ebay.com',
    'alibaba.com',
    'aliexpress.com',
    'walmart.com',
    'target.com',
    'bestbuy.com',
    'costco.com',
    'etsy.com',
    'wayfair.com',
    'overstock.com',
    'wish.com',
    'nordstrom.com',
    'macys.com',
    'kohls.com',
    'sephora.com', // Unless specifically cosmetics
    'ulta.com',
    // Social media
    'facebook.com',
    'instagram.com',
    'twitter.com',
    'tiktok.com',
    'linkedin.com',
    'youtube.com',
    'pinterest.com',
    'reddit.com',
    // Other
    'wikipedia.org',
    'yelp.com',
    'tripadvisor.com',
    'squareup.com',
    'shopify.com',
    'wix.com',
    'onlinestores.com',
    'usda.gov',
    'gov',
    '.edu',
  ];

  const urlLower = url.toLowerCase();
  
  // Exclude marketplaces and social media
  if (invalidDomains.some(domain => urlLower.includes(domain))) {
    return false;
  }

  // Exclude PDFs, images, etc.
  if (urlLower.match(/\.(pdf|jpg|jpeg|png|gif|doc|docx|zip)$/)) {
    return false;
  }

  return true;
}

