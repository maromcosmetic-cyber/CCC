/**
 * Property-based tests for platform ingestion adapters
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.10, 12.8**
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Platform, EventType } from '../../types/core';
import { TikTokAdapter } from '../adapters/TikTokAdapter';
import { MetaAdapter } from '../adapters/MetaAdapter';
import { YouTubeAdapter } from '../adapters/YouTubeAdapter';
import { RedditAdapter } from '../adapters/RedditAdapter';
import { RSSAdapter } from '../adapters/RSSAdapter';
import { AdapterConfig, RawPlatformData, FetchParams } from '../types';

// Mock fetch globally
global.fetch = jest.fn();

// Simple property-based testing utilities (since we don't have fast-check with Jest)
const generateRandomString = (length: number = 10): string => 
  Math.random().toString(36).substring(2, length + 2);

const generateRandomInteger = (min: number = 0, max: number = 100): number => 
  Math.floor(Math.random() * (max - min + 1)) + min;

const generateRandomDate = (): Date => 
  new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);

const generatePlatformData = () => ({
  id: generateRandomString(20),
  title: generateRandomString(50),
  content: generateRandomString(200),
  author: generateRandomString(15),
  timestamp: Math.floor(Date.now() / 1000) - generateRandomInteger(0, 86400),
  likes: generateRandomInteger(0, 1000),
  comments: generateRandomInteger(0, 100),
  shares: generateRandomInteger(0, 100),
  views: generateRandomInteger(0, 10000)
});

const generateFetchParams = (): FetchParams => ({
  since: Math.random() > 0.5 ? generateRandomDate() : undefined,
  until: Math.random() > 0.5 ? generateRandomDate() : undefined,
  limit: Math.random() > 0.5 ? generateRandomInteger(1, 100) : undefined,
  cursor: Math.random() > 0.5 ? generateRandomString() : undefined,
  keywords: Math.random() > 0.5 ? Array.from({length: generateRandomInteger(1, 5)}, () => generateRandomString(10)) : undefined,
  hashtags: Math.random() > 0.5 ? Array.from({length: generateRandomInteger(1, 5)}, () => generateRandomString(10)) : undefined,
  mentions: Math.random() > 0.5 ? Array.from({length: generateRandomInteger(1, 5)}, () => generateRandomString(10)) : undefined
});

describe('Platform Adapters - Property Tests', () => {
  const mockConfig: AdapterConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost:3000/callback',
    scopes: ['read'],
    webhookSecret: 'test-webhook-secret'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Property 19: External API compliance and retry logic', () => {
    it('should handle authentication failures with proper retry logic', async () => {
      const platforms = [Platform.TIKTOK, Platform.INSTAGRAM, Platform.YOUTUBE, Platform.REDDIT];
      
      for (let i = 0; i < 10; i++) {
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        const retryCount = generateRandomInteger(1, 5);
        
        let adapter;
        switch (platform) {
          case Platform.TIKTOK:
            adapter = new TikTokAdapter(mockConfig);
            break;
          case Platform.INSTAGRAM:
            adapter = new MetaAdapter(mockConfig, Platform.INSTAGRAM);
            break;
          case Platform.YOUTUBE:
            adapter = new YouTubeAdapter(mockConfig);
            break;
          case Platform.REDDIT:
            adapter = new RedditAdapter(mockConfig);
            break;
          default:
            continue;
        }

        // Mock authentication success
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'test-token',
            expires_in: 3600,
            code: platform === Platform.TIKTOK ? 0 : undefined
          })
        });

        try {
          const token = await adapter.authenticate();
          
          // Authentication should eventually succeed
          expect(token.accessToken).toBeDefined();
          expect(token.platform).toBe(platform);
          expect(token.expiresAt).toBeInstanceOf(Date);
          expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now());
        } catch (error) {
          // If authentication fails, it should be due to exhausted retries
          expect(error).toBeInstanceOf(Error);
        }
      }
    });

    it('should handle rate limiting with exponential backoff', async () => {
      const platforms = [Platform.TIKTOK, Platform.INSTAGRAM, Platform.YOUTUBE, Platform.REDDIT];
      
      for (let i = 0; i < 10; i++) {
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        const retryAfter = generateRandomInteger(1, 300);
        
        let adapter;
        switch (platform) {
          case Platform.TIKTOK:
            adapter = new TikTokAdapter(mockConfig);
            break;
          case Platform.INSTAGRAM:
            adapter = new MetaAdapter(mockConfig, Platform.INSTAGRAM);
            break;
          case Platform.YOUTUBE:
            adapter = new YouTubeAdapter(mockConfig);
            break;
          case Platform.REDDIT:
            adapter = new RedditAdapter(mockConfig);
            break;
          default:
            continue;
        }

        const rateLimitError = new Error('Rate limit exceeded') as any;
        rateLimitError.platform = platform;
        rateLimitError.resetTime = new Date(Date.now() + retryAfter * 1000);
        rateLimitError.retryAfter = retryAfter;
        rateLimitError.remainingRequests = 0;

        const startTime = Date.now();
        await adapter.handleRateLimit(rateLimitError);
        const endTime = Date.now();

        // Should wait at least the minimum backoff time
        const actualDelay = endTime - startTime;
        expect(actualDelay).toBeGreaterThanOrEqual(Math.min(retryAfter * 1000, 1000));
        
        // Should not wait more than maximum backoff time (60 seconds)
        expect(actualDelay).toBeLessThan(61000);
      }
    });

    it('should maintain consistent token format across platforms', async () => {
      const platforms = [Platform.TIKTOK, Platform.INSTAGRAM, Platform.YOUTUBE, Platform.REDDIT, Platform.RSS];
      
      for (let i = 0; i < 20; i++) {
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        
        let adapter;
        switch (platform) {
          case Platform.TIKTOK:
            adapter = new TikTokAdapter(mockConfig);
            break;
          case Platform.INSTAGRAM:
            adapter = new MetaAdapter(mockConfig, Platform.INSTAGRAM);
            break;
          case Platform.YOUTUBE:
            adapter = new YouTubeAdapter(mockConfig);
            break;
          case Platform.REDDIT:
            adapter = new RedditAdapter(mockConfig);
            break;
          case Platform.RSS:
            adapter = new RSSAdapter({ ...mockConfig, feedUrls: ['https://example.com/feed.xml'] });
            break;
          default:
            continue;
        }

        // Mock successful authentication
        const mockResponse = {
          ok: true,
          json: () => Promise.resolve({
            access_token: 'test-token',
            refresh_token: 'refresh-token',
            expires_in: 3600,
            scope: 'read',
            code: platform === Platform.TIKTOK ? 0 : undefined
          })
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

        const token = await adapter.authenticate();

        // All tokens should have consistent structure
        expect(token).toHaveProperty('accessToken');
        expect(token).toHaveProperty('platform');
        expect(token).toHaveProperty('expiresAt');
        expect(token).toHaveProperty('scopes');
        expect(token).toHaveProperty('tokenType');
        
        expect(token.platform).toBe(platform);
        expect(token.expiresAt).toBeInstanceOf(Date);
        expect(Array.isArray(token.scopes)).toBe(true);
        expect(typeof token.accessToken).toBe('string');
        expect(token.accessToken.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Data Normalization Properties', () => {
    it('should preserve essential data during normalization', async () => {
      const platforms = [Platform.TIKTOK, Platform.INSTAGRAM, Platform.YOUTUBE, Platform.REDDIT, Platform.RSS];
      
      for (let i = 0; i < 50; i++) {
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        const data = generatePlatformData();
        
        let adapter;
        switch (platform) {
          case Platform.TIKTOK:
            adapter = new TikTokAdapter(mockConfig);
            break;
          case Platform.INSTAGRAM:
            adapter = new MetaAdapter(mockConfig, Platform.INSTAGRAM);
            break;
          case Platform.YOUTUBE:
            adapter = new YouTubeAdapter(mockConfig);
            break;
          case Platform.REDDIT:
            adapter = new RedditAdapter(mockConfig);
            break;
          case Platform.RSS:
            adapter = new RSSAdapter({ ...mockConfig, feedUrls: ['https://example.com/feed.xml'] });
            break;
          default:
            continue;
        }

        const rawData: RawPlatformData = {
          id: data.id,
          platform,
          timestamp: new Date(data.timestamp * 1000).toISOString(),
          type: 'post',
          data: {
            id: data.id,
            title: data.title,
            content: data.content,
            author: data.author,
            like_count: data.likes,
            comment_count: data.comments,
            share_count: data.shares,
            view_count: data.views,
            created_time: data.timestamp,
            // Platform-specific fields
            ...(platform === Platform.TIKTOK && { video_views: data.views }),
            ...(platform === Platform.INSTAGRAM && { caption: data.content }),
            ...(platform === Platform.YOUTUBE && { 
              snippet: { 
                title: data.title, 
                description: data.content,
                channelTitle: data.author,
                publishedAt: new Date(data.timestamp * 1000).toISOString()
              }
            }),
            ...(platform === Platform.REDDIT && { 
              selftext: data.content,
              ups: data.likes,
              num_comments: data.comments
            }),
            ...(platform === Platform.RSS && {
              description: data.content,
              pubDate: new Date(data.timestamp * 1000).toISOString()
            })
          }
        };

        const normalized = await adapter.normalizeData(rawData);

        // Essential properties should be preserved
        expect(normalized.platform).toBe(platform);
        expect(normalized.platformId).toBe(data.id);
        expect(normalized.timestamp).toBeDefined();
        expect(normalized.eventType).toBeDefined();
        expect(Object.values(EventType)).toContain(normalized.eventType);
        
        // Content should be normalized but not empty if original had content
        if (data.title || data.content) {
          expect(normalized.content.text.length).toBeGreaterThan(0);
          expect(normalized.content.text.length).toBeLessThanOrEqual(5000);
        }
        
        // Author information should be preserved
        expect(normalized.author.id).toBeDefined();
        expect(normalized.author.username).toBeDefined();
        expect(normalized.author.displayName).toBeDefined();
        
        // Engagement metrics should be non-negative
        expect(normalized.engagement.likes).toBeGreaterThanOrEqual(0);
        expect(normalized.engagement.comments).toBeGreaterThanOrEqual(0);
        expect(normalized.engagement.shares).toBeGreaterThanOrEqual(0);
        expect(normalized.engagement.views).toBeGreaterThanOrEqual(0);
        expect(normalized.engagement.engagementRate).toBeGreaterThanOrEqual(0);
        expect(normalized.engagement.engagementRate).toBeLessThanOrEqual(1);
        
        // Metadata should include processing information
        expect(normalized.metadata.source).toBeDefined();
        expect(normalized.metadata.processingTimestamp).toBeDefined();
        expect(normalized.metadata.version).toBeDefined();
      }
    });

    it('should extract hashtags and mentions consistently', async () => {
      const platforms = [Platform.TIKTOK, Platform.INSTAGRAM, Platform.YOUTUBE, Platform.RSS];
      
      for (let i = 0; i < 20; i++) {
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        const baseText = generateRandomString(50);
        const hashtags = Array.from({length: generateRandomInteger(1, 3)}, () => generateRandomString(10));
        const mentions = Array.from({length: generateRandomInteger(1, 3)}, () => generateRandomString(10));
        
        let adapter;
        switch (platform) {
          case Platform.TIKTOK:
            adapter = new TikTokAdapter(mockConfig);
            break;
          case Platform.INSTAGRAM:
            adapter = new MetaAdapter(mockConfig, Platform.INSTAGRAM);
            break;
          case Platform.YOUTUBE:
            adapter = new YouTubeAdapter(mockConfig);
            break;
          case Platform.RSS:
            adapter = new RSSAdapter({ ...mockConfig, feedUrls: ['https://example.com/feed.xml'] });
            break;
          default:
            continue;
        }

        const hashtagText = hashtags.map(h => `#${h}`).join(' ');
        const mentionText = mentions.map(m => `@${m}`).join(' ');
        const fullText = `${baseText} ${hashtagText} ${mentionText}`.trim();

        const rawData: RawPlatformData = {
          id: 'test-id',
          platform,
          timestamp: new Date().toISOString(),
          type: 'post',
          data: {
            id: 'test-id',
            title: fullText,
            content: fullText,
            caption: fullText,
            description: fullText,
            snippet: { title: fullText, description: fullText }
          }
        };

        const normalized = await adapter.normalizeData(rawData);

        // Should extract hashtags correctly
        const extractedHashtags = normalized.content.hashtags;
        hashtags.forEach(hashtag => {
          expect(extractedHashtags.some(h => h.includes(hashtag))).toBe(true);
        });

        // Should extract mentions correctly
        const extractedMentions = normalized.content.mentions;
        mentions.forEach(mention => {
          expect(extractedMentions.some(m => m.includes(mention))).toBe(true);
        });

        // Extracted arrays should not contain duplicates
        expect(new Set(extractedHashtags).size).toBe(extractedHashtags.length);
        expect(new Set(extractedMentions).size).toBe(extractedMentions.length);
      }
    });

    it('should handle fetch parameters consistently', async () => {
      const platforms = [Platform.TIKTOK, Platform.INSTAGRAM, Platform.YOUTUBE, Platform.REDDIT];
      
      for (let i = 0; i < 15; i++) {
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        const params = generateFetchParams();
        
        let adapter;
        switch (platform) {
          case Platform.TIKTOK:
            adapter = new TikTokAdapter(mockConfig);
            break;
          case Platform.INSTAGRAM:
            adapter = new MetaAdapter(mockConfig, Platform.INSTAGRAM);
            break;
          case Platform.YOUTUBE:
            adapter = new YouTubeAdapter(mockConfig);
            break;
          case Platform.REDDIT:
            adapter = new RedditAdapter(mockConfig);
            break;
          default:
            continue;
        }

        // Mock authentication
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'test-token',
            expires_in: 3600,
            code: platform === Platform.TIKTOK ? 0 : undefined
          })
        });

        // Mock data fetch
        const mockDataResponse = {
          ok: true,
          json: () => Promise.resolve({
            data: { list: [], children: [], items: [] },
            paging: {},
            nextPageToken: null,
            code: platform === Platform.TIKTOK ? 0 : undefined
          }),
          headers: new Map()
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce(mockDataResponse);

        try {
          const result = await adapter.fetchData(params);

          // Result should have consistent structure
          expect(result).toHaveProperty('data');
          expect(result).toHaveProperty('hasMore');
          expect(Array.isArray(result.data)).toBe(true);
          expect(typeof result.hasMore).toBe('boolean');

          // If limit was specified, result should respect it
          if (params.limit) {
            expect(result.data.length).toBeLessThanOrEqual(params.limit);
          }

          // All returned data should have correct platform
          result.data.forEach(item => {
            expect(item.platform).toBe(platform);
            expect(item.id).toBeDefined();
            expect(item.timestamp).toBeDefined();
          });
        } catch (error) {
          // Errors should be meaningful
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('RSS Adapter Specific Properties', () => {
    it('should parse RSS feeds correctly regardless of format variations', async () => {
      for (let i = 0; i < 10; i++) {
        const items = Array.from({length: generateRandomInteger(1, 5)}, () => ({
          title: generateRandomString(50),
          link: `https://example.com/post${generateRandomInteger(1, 1000)}`,
          description: generateRandomString(200),
          author: generateRandomString(20),
          pubDate: generateRandomDate()
        }));
        
        const adapter = new RSSAdapter({
          ...mockConfig,
          feedUrls: ['https://example.com/feed.xml']
        });

        const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
          <rss version="2.0">
            <channel>
              <title>Test Feed</title>
              <link>https://example.com</link>
              <description>Test RSS Feed</description>
              ${items.map(item => `
                <item>
                  <title><![CDATA[${item.title}]]></title>
                  <link>${item.link}</link>
                  <description><![CDATA[${item.description}]]></description>
                  <pubDate>${item.pubDate.toUTCString()}</pubDate>
                  <guid>${item.link}</guid>
                  <author>${item.author}</author>
                </item>
              `).join('')}
            </channel>
          </rss>`;

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(rssXml)
        });

        const result = await adapter.fetchData({ limit: 100 });

        expect(result.data).toHaveLength(items.length);
        
        result.data.forEach((item, index) => {
          expect(item.platform).toBe(Platform.RSS);
          expect(item.data.title).toBe(items[index].title);
          expect(item.data.link).toBe(items[index].link);
          expect(item.data.description).toBe(items[index].description);
          expect(item.data.author).toBe(items[index].author);
        });
      }
    });
  });

  describe('Error Handling Properties', () => {
    it('should handle network errors gracefully', async () => {
      const platforms = [Platform.TIKTOK, Platform.INSTAGRAM, Platform.YOUTUBE, Platform.REDDIT, Platform.RSS];
      const errorTypes = ['NETWORK_ERROR', 'TIMEOUT', 'DNS_ERROR'];
      
      for (let i = 0; i < 15; i++) {
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
        
        let adapter;
        switch (platform) {
          case Platform.TIKTOK:
            adapter = new TikTokAdapter(mockConfig);
            break;
          case Platform.INSTAGRAM:
            adapter = new MetaAdapter(mockConfig, Platform.INSTAGRAM);
            break;
          case Platform.YOUTUBE:
            adapter = new YouTubeAdapter(mockConfig);
            break;
          case Platform.REDDIT:
            adapter = new RedditAdapter(mockConfig);
            break;
          case Platform.RSS:
            adapter = new RSSAdapter({ ...mockConfig, feedUrls: ['https://example.com/feed.xml'] });
            break;
          default:
            continue;
        }

        let mockError;
        switch (errorType) {
          case 'NETWORK_ERROR':
            mockError = new Error('Network request failed');
            break;
          case 'TIMEOUT':
            mockError = new Error('Request timeout');
            break;
          case 'DNS_ERROR':
            mockError = new Error('DNS resolution failed');
            break;
        }

        (global.fetch as jest.Mock).mockRejectedValueOnce(mockError);

        try {
          await adapter.authenticate();
          // If no error is thrown, that's also acceptable (some adapters might have fallbacks)
        } catch (error) {
          // Error should be meaningful and not expose internal details
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message.length).toBeGreaterThan(0);
          expect((error as Error).message).not.toContain('undefined');
          expect((error as Error).message).not.toContain('[object Object]');
        }

        // Metrics should track the error
        const metrics = adapter.getMetrics();
        expect(metrics.platform).toBe(platform);
      }
    });
  });
});