/**
 * RSS and Web Crawler Adapter
 */

import { Platform, SocialEvent, EventType } from '../../types/core';
import { AuthToken } from '../../auth/types';
import { BaseAdapter } from '../BaseAdapter';
import { 
  RawPlatformData, 
  FetchParams, 
  FetchResult, 
  AdapterConfig 
} from '../types';

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid: string;
  author?: string;
  category?: string[];
  content?: string;
}

interface RSSFeed {
  title: string;
  link: string;
  description: string;
  items: RSSItem[];
}

export class RSSAdapter extends BaseAdapter {
  private feedUrls: string[];
  private userAgent = 'SocialIntelligence/1.0 RSS Reader';

  constructor(config: AdapterConfig & { feedUrls: string[] }) {
    super(Platform.RSS, config);
    this.feedUrls = config.feedUrls || [];
  }

  /**
   * RSS doesn't require authentication, return a dummy token
   */
  async authenticate(): Promise<AuthToken> {
    return {
      accessToken: 'rss-no-auth-required',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      scopes: [],
      platform: Platform.RSS,
      tokenType: 'None'
    };
  }

  /**
   * RSS doesn't require token refresh
   */
  async refreshToken(token: AuthToken): Promise<AuthToken> {
    return token;
  }

  /**
   * Fetch data from RSS feeds
   */
  async fetchData(params: FetchParams): Promise<FetchResult> {
    const results: RawPlatformData[] = [];
    
    for (const feedUrl of this.feedUrls) {
      try {
        const feedData = await this.fetchRSSFeed(feedUrl, params);
        results.push(...feedData.data);
      } catch (error) {
        console.error(`Failed to fetch RSS feed ${feedUrl}:`, error);
        this.metrics.errorsEncountered++;
      }
    }

    return {
      data: results,
      hasMore: false, // RSS feeds don't have pagination
      rateLimit: {
        remaining: 1000, // Conservative rate limiting
        resetTime: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      }
    };
  }

  /**
   * Fetch and parse a single RSS feed
   */
  private async fetchRSSFeed(feedUrl: string, params: FetchParams): Promise<FetchResult> {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.statusText}`);
    }

    const xmlText = await response.text();
    const feed = await this.parseRSSFeed(xmlText, feedUrl);
    
    // Filter items based on date parameters
    let items = feed.items;
    
    if (params.since) {
      items = items.filter(item => new Date(item.pubDate) >= params.since!);
    }
    
    if (params.until) {
      items = items.filter(item => new Date(item.pubDate) <= params.until!);
    }
    
    if (params.limit) {
      items = items.slice(0, params.limit);
    }

    // Filter by keywords if provided
    if (params.keywords && params.keywords.length > 0) {
      const keywords = params.keywords.map(k => k.toLowerCase());
      items = items.filter(item => {
        const searchText = (item.title + ' ' + item.description + ' ' + (item.content || '')).toLowerCase();
        return keywords.some(keyword => searchText.includes(keyword));
      });
    }

    const rawData: RawPlatformData[] = items.map(item => ({
      id: item.guid || item.link,
      platform: Platform.RSS,
      timestamp: this.parseTimestamp(item.pubDate),
      type: 'article',
      data: {
        ...item,
        feedUrl,
        feedTitle: feed.title
      },
      metadata: {
        source: 'rss_feed',
        feedUrl,
        feedTitle: feed.title
      }
    }));

    return {
      data: rawData,
      hasMore: false
    };
  }

  /**
   * Parse RSS XML feed
   */
  private async parseRSSFeed(xmlText: string, feedUrl: string): Promise<RSSFeed> {
    // Simple XML parsing - in production, use a proper XML parser like 'fast-xml-parser'
    const feed: RSSFeed = {
      title: this.extractXMLValue(xmlText, 'title') || 'Unknown Feed',
      link: this.extractXMLValue(xmlText, 'link') || feedUrl,
      description: this.extractXMLValue(xmlText, 'description') || '',
      items: []
    };

    // Extract items
    const itemMatches = xmlText.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
    
    for (const itemXml of itemMatches) {
      const item: RSSItem = {
        title: this.extractXMLValue(itemXml, 'title') || 'Untitled',
        link: this.extractXMLValue(itemXml, 'link') || '',
        description: this.extractXMLValue(itemXml, 'description') || '',
        pubDate: this.extractXMLValue(itemXml, 'pubDate') || new Date().toISOString(),
        guid: this.extractXMLValue(itemXml, 'guid') || this.extractXMLValue(itemXml, 'link') || '',
        author: this.extractXMLValue(itemXml, 'author') || this.extractXMLValue(itemXml, 'dc:creator'),
        content: this.extractXMLValue(itemXml, 'content:encoded') || this.extractXMLValue(itemXml, 'description')
      };

      // Extract categories
      const categoryMatches = itemXml.match(/<category[^>]*>([^<]*)<\/category>/gi) || [];
      item.category = categoryMatches.map(match => {
        const content = match.replace(/<[^>]*>/g, '').trim();
        return content;
      }).filter(Boolean);

      feed.items.push(item);
    }

    return feed;
  }

  /**
   * Extract value from XML tag
   */
  private extractXMLValue(xml: string, tagName: string): string | undefined {
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const match = xml.match(regex);
    if (match && match[1]) {
      return match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
    }
    return undefined;
  }

  /**
   * Normalize RSS data to SocialEvent format
   */
  async normalizeData(rawData: RawPlatformData): Promise<SocialEvent> {
    const data = rawData.data;
    
    return {
      id: this.generateEventId(rawData.id),
      platform: Platform.RSS,
      platformId: rawData.id,
      timestamp: rawData.timestamp,
      eventType: EventType.POST,
      content: {
        text: this.normalizeText(data.title + '\n\n' + (data.content || data.description || '')),
        mediaUrls: this.extractMediaUrls(data.content || data.description || ''),
        hashtags: this.extractHashtags(data.content || data.description || ''),
        mentions: this.extractMentions(data.content || data.description || ''),
        language: 'en' // RSS feeds don't typically specify language
      },
      author: {
        id: data.author || data.feedTitle || 'unknown',
        username: data.author || data.feedTitle || 'unknown',
        displayName: data.author || data.feedTitle || 'Unknown Author',
        followerCount: 0,
        verified: false,
        profileUrl: data.feedUrl
      },
      engagement: {
        likes: 0, // RSS doesn't provide engagement metrics
        shares: 0,
        comments: 0,
        views: 0,
        engagementRate: 0
      },
      context: {
        isReply: false,
        threadId: data.guid || data.link
      },
      location: {
        // Extract location from content if available
        url: data.link
      },
      metadata: {
        source: 'rss',
        processingTimestamp: new Date().toISOString(),
        version: '1.0',
        rawData: JSON.stringify(rawData.data),
        feedUrl: data.feedUrl,
        feedTitle: data.feedTitle,
        categories: data.category
      }
    };
  }

  /**
   * Extract media URLs from HTML content
   */
  private extractMediaUrls(content: string): string[] {
    const urls: string[] = [];
    
    // Extract image URLs from HTML
    const imgMatches = content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
    imgMatches.forEach(match => {
      const srcMatch = match.match(/src=["']([^"']+)["']/i);
      if (srcMatch && srcMatch[1]) {
        urls.push(srcMatch[1]);
      }
    });

    // Extract video URLs
    const videoMatches = content.match(/<video[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
    videoMatches.forEach(match => {
      const srcMatch = match.match(/src=["']([^"']+)["']/i);
      if (srcMatch && srcMatch[1]) {
        urls.push(srcMatch[1]);
      }
    });

    return urls;
  }

  /**
   * Override makeRequest to respect robots.txt and be respectful
   */
  protected async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    // Add delay between requests to be respectful
    await this.sleep(1000);

    const headers = {
      'User-Agent': this.userAgent,
      'Accept': 'application/rss+xml, application/xml, text/xml, text/html',
      ...options.headers
    };

    return fetch(url, { ...options, headers });
  }

  /**
   * Check robots.txt compliance (simplified implementation)
   */
  private async checkRobotsTxt(url: string): Promise<boolean> {
    try {
      const urlObj = new URL(url);
      const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
      
      const response = await fetch(robotsUrl, {
        headers: { 'User-Agent': this.userAgent }
      });
      
      if (!response.ok) {
        return true; // If robots.txt doesn't exist, assume allowed
      }
      
      const robotsText = await response.text();
      
      // Simple robots.txt parsing - check for disallow rules
      const lines = robotsText.split('\n');
      let userAgentMatch = false;
      
      for (const line of lines) {
        const trimmed = line.trim().toLowerCase();
        
        if (trimmed.startsWith('user-agent:')) {
          const agent = trimmed.replace('user-agent:', '').trim();
          userAgentMatch = agent === '*' || agent === 'socialintelligence';
        }
        
        if (userAgentMatch && trimmed.startsWith('disallow:')) {
          const disallowPath = trimmed.replace('disallow:', '').trim();
          if (disallowPath === '/' || url.includes(disallowPath)) {
            return false; // Disallowed
          }
        }
      }
      
      return true; // Allowed
    } catch (error) {
      console.warn(`Failed to check robots.txt for ${url}:`, error);
      return true; // Assume allowed if check fails
    }
  }

  /**
   * Add RSS feed URL to monitor
   */
  addFeedUrl(feedUrl: string): void {
    if (!this.feedUrls.includes(feedUrl)) {
      this.feedUrls.push(feedUrl);
    }
  }

  /**
   * Remove RSS feed URL from monitoring
   */
  removeFeedUrl(feedUrl: string): void {
    const index = this.feedUrls.indexOf(feedUrl);
    if (index > -1) {
      this.feedUrls.splice(index, 1);
    }
  }

  /**
   * Get list of monitored feed URLs
   */
  getFeedUrls(): string[] {
    return [...this.feedUrls];
  }
}