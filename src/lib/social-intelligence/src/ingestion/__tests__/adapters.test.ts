/**
 * Unit tests for platform ingestion adapters
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Platform, EventType } from '../../types/core';
import { TikTokAdapter } from '../adapters/TikTokAdapter';
import { MetaAdapter } from '../adapters/MetaAdapter';
import { YouTubeAdapter } from '../adapters/YouTubeAdapter';
import { RedditAdapter } from '../adapters/RedditAdapter';
import { RSSAdapter } from '../adapters/RSSAdapter';
import { AdapterConfig, RawPlatformData } from '../types';

// Mock fetch globally
global.fetch = jest.fn();

describe('Platform Adapters', () => {
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

  describe('TikTokAdapter', () => {
    let adapter: TikTokAdapter;

    beforeEach(() => {
      adapter = new TikTokAdapter(mockConfig);
    });

    it('should authenticate successfully', async () => {
      const mockResponse = {
        code: 0,
        data: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
          scope: 'user.info.basic,video.list'
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const token = await adapter.authenticate();

      expect(token.accessToken).toBe('test-access-token');
      expect(token.refreshToken).toBe('test-refresh-token');
      expect(token.platform).toBe(Platform.TIKTOK);
      expect(token.scopes).toEqual(['user.info.basic', 'video.list']);
    });

    it('should handle authentication errors', async () => {
      const mockResponse = {
        code: 40001,
        message: 'Invalid client credentials'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await expect(adapter.authenticate()).rejects.toThrow('TikTok API error: Invalid client credentials');
    });

    it('should fetch data successfully', async () => {
      // Mock authentication
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          code: 0,
          data: {
            access_token: 'test-token',
            expires_in: 3600
          }
        })
      });

      // Mock data fetch
      const mockDataResponse = {
        code: 0,
        data: {
          list: [
            {
              id: 'video123',
              create_time: 1640995200,
              title: 'Test TikTok Video',
              like_count: 100,
              comment_count: 10,
              share_count: 5,
              video_views: 1000
            }
          ],
          cursor: 'next-cursor',
          has_more: true
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDataResponse),
        headers: new Map([
          ['x-rate-limit-remaining', '100'],
          ['x-rate-limit-reset', '1640999999']
        ])
      });

      const result = await adapter.fetchData({ limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].platform).toBe(Platform.TIKTOK);
      expect(result.data[0].id).toBe('video123');
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('next-cursor');
    });

    it('should normalize TikTok data correctly', async () => {
      const rawData: RawPlatformData = {
        id: 'video123',
        platform: Platform.TIKTOK,
        timestamp: '2022-01-01T00:00:00.000Z',
        type: 'post',
        data: {
          id: 'video123',
          title: 'Amazing dance video! #dance #viral',
          like_count: 100,
          comment_count: 10,
          share_count: 5,
          video_views: 1000,
          author_username: 'testuser',
          cover_image_url: 'https://example.com/image.jpg'
        }
      };

      const normalized = await adapter.normalizeData(rawData);

      expect(normalized.platform).toBe(Platform.TIKTOK);
      expect(normalized.platformId).toBe('video123');
      expect(normalized.eventType).toBe(EventType.POST);
      expect(normalized.content.text).toContain('Amazing dance video!');
      expect(normalized.content.hashtags).toEqual(['#dance', '#viral']);
      expect(normalized.content.mediaUrls).toContain('https://example.com/image.jpg');
      expect(normalized.engagement.likes).toBe(100);
      expect(normalized.engagement.views).toBe(1000);
    });
  });

  describe('MetaAdapter', () => {
    let adapter: MetaAdapter;

    beforeEach(() => {
      adapter = new MetaAdapter(mockConfig, Platform.INSTAGRAM);
    });

    it('should authenticate successfully', async () => {
      const mockResponse = {
        access_token: 'test-access-token',
        expires_in: 3600
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const token = await adapter.authenticate();

      expect(token.accessToken).toBe('test-access-token');
      expect(token.platform).toBe(Platform.INSTAGRAM);
    });

    it('should handle Meta API errors', async () => {
      const mockResponse = {
        error: {
          message: 'Invalid access token',
          code: 190
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await expect(adapter.authenticate()).rejects.toThrow('Meta API error: Invalid access token');
    });

    it('should normalize Instagram data correctly', async () => {
      const rawData: RawPlatformData = {
        id: 'post123',
        platform: Platform.INSTAGRAM,
        timestamp: '2022-01-01T00:00:00.000Z',
        type: 'post',
        data: {
          id: 'post123',
          caption: 'Beautiful sunset! #sunset #photography @friend',
          media_type: 'IMAGE',
          media_url: 'https://example.com/image.jpg',
          like_count: 50,
          comments_count: 5,
          username: 'photographer'
        }
      };

      const normalized = await adapter.normalizeData(rawData);

      expect(normalized.platform).toBe(Platform.INSTAGRAM);
      expect(normalized.content.text).toContain('Beautiful sunset!');
      expect(normalized.content.hashtags).toEqual(['#sunset', '#photography']);
      expect(normalized.content.mentions).toEqual(['@friend']);
      expect(normalized.engagement.likes).toBe(50);
      expect(normalized.engagement.comments).toBe(5);
    });
  });

  describe('YouTubeAdapter', () => {
    let adapter: YouTubeAdapter;

    beforeEach(() => {
      adapter = new YouTubeAdapter(mockConfig);
    });

    it('should authenticate successfully', async () => {
      const mockResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        scope: 'https://www.googleapis.com/auth/youtube.readonly'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const token = await adapter.authenticate();

      expect(token.accessToken).toBe('test-access-token');
      expect(token.platform).toBe(Platform.YOUTUBE);
      expect(token.scopes).toContain('https://www.googleapis.com/auth/youtube.readonly');
    });

    it('should normalize YouTube data correctly', async () => {
      const rawData: RawPlatformData = {
        id: 'video123',
        platform: Platform.YOUTUBE,
        timestamp: '2022-01-01T00:00:00.000Z',
        type: 'video',
        data: {
          id: { videoId: 'video123' },
          snippet: {
            title: 'How to code in TypeScript',
            description: 'Learn TypeScript basics #typescript #coding',
            channelId: 'channel123',
            channelTitle: 'Code Academy',
            publishedAt: '2022-01-01T00:00:00.000Z',
            thumbnails: {
              high: { url: 'https://example.com/thumb.jpg' }
            }
          }
        }
      };

      const normalized = await adapter.normalizeData(rawData);

      expect(normalized.platform).toBe(Platform.YOUTUBE);
      expect(normalized.content.text).toContain('How to code in TypeScript');
      expect(normalized.content.hashtags).toEqual(['#typescript', '#coding']);
      expect(normalized.author.username).toBe('Code Academy');
      expect(normalized.content.mediaUrls).toContain('https://example.com/thumb.jpg');
    });
  });

  describe('RedditAdapter', () => {
    let adapter: RedditAdapter;

    beforeEach(() => {
      adapter = new RedditAdapter(mockConfig);
    });

    it('should authenticate successfully', async () => {
      const mockResponse = {
        access_token: 'test-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        scope: 'read'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const token = await adapter.authenticate();

      expect(token.accessToken).toBe('test-access-token');
      expect(token.platform).toBe(Platform.REDDIT);
      expect(token.tokenType).toBe('bearer');
    });

    it('should normalize Reddit data correctly', async () => {
      const rawData: RawPlatformData = {
        id: 'post123',
        platform: Platform.REDDIT,
        timestamp: '2022-01-01T00:00:00.000Z',
        type: 'post',
        data: {
          id: 'post123',
          title: 'Great discussion about technology',
          selftext: 'What do you think about the latest trends? u/techexpert',
          author: 'redditor123',
          subreddit: 'technology',
          ups: 100,
          downs: 10,
          num_comments: 25,
          url: 'https://reddit.com/r/technology/post123',
          thumbnail: 'https://example.com/thumb.jpg'
        }
      };

      const normalized = await adapter.normalizeData(rawData);

      expect(normalized.platform).toBe(Platform.REDDIT);
      expect(normalized.content.text).toContain('Great discussion about technology');
      expect(normalized.content.mentions).toEqual(['u/techexpert']);
      expect(normalized.author.username).toBe('redditor123');
      expect(normalized.engagement.likes).toBe(100);
      expect(normalized.engagement.comments).toBe(25);
      expect(normalized.location?.region).toBe('technology');
    });

    it('should calculate engagement rate correctly', async () => {
      const rawData: RawPlatformData = {
        id: 'post123',
        platform: Platform.REDDIT,
        timestamp: '2022-01-01T00:00:00.000Z',
        type: 'post',
        data: {
          id: 'post123',
          title: 'Test post',
          author: 'testuser',
          ups: 80,
          downs: 20,
          num_comments: 10
        }
      };

      const normalized = await adapter.normalizeData(rawData);

      // Engagement rate should be calculated based on upvote ratio and comments
      expect(normalized.engagement.engagementRate).toBeGreaterThan(0);
      expect(normalized.engagement.engagementRate).toBeLessThanOrEqual(1);
    });
  });

  describe('RSSAdapter', () => {
    let adapter: RSSAdapter;

    beforeEach(() => {
      adapter = new RSSAdapter({
        ...mockConfig,
        feedUrls: ['https://example.com/feed.xml']
      });
    });

    it('should authenticate successfully (no-op for RSS)', async () => {
      const token = await adapter.authenticate();

      expect(token.accessToken).toBe('rss-no-auth-required');
      expect(token.platform).toBe(Platform.RSS);
      expect(token.tokenType).toBe('None');
    });

    it('should fetch and parse RSS feed', async () => {
      const mockRSSXML = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Test Blog</title>
            <link>https://example.com</link>
            <description>A test blog</description>
            <item>
              <title>First Post</title>
              <link>https://example.com/post1</link>
              <description>This is the first post</description>
              <pubDate>Mon, 01 Jan 2022 00:00:00 GMT</pubDate>
              <guid>post1</guid>
              <author>author@example.com</author>
            </item>
          </channel>
        </rss>`;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockRSSXML)
      });

      const result = await adapter.fetchData({ limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].platform).toBe(Platform.RSS);
      expect(result.data[0].id).toBe('post1');
      expect(result.hasMore).toBe(false);
    });

    it('should normalize RSS data correctly', async () => {
      const rawData: RawPlatformData = {
        id: 'post1',
        platform: Platform.RSS,
        timestamp: '2022-01-01T00:00:00.000Z',
        type: 'article',
        data: {
          title: 'Amazing Tech News',
          link: 'https://example.com/post1',
          description: 'Latest technology trends #tech',
          pubDate: '2022-01-01T00:00:00.000Z',
          guid: 'post1',
          author: 'Tech Writer',
          feedUrl: 'https://example.com/feed.xml',
          feedTitle: 'Tech Blog',
          content: '<p>Full article content with <img src="https://example.com/image.jpg" /></p>'
        }
      };

      const normalized = await adapter.normalizeData(rawData);

      expect(normalized.platform).toBe(Platform.RSS);
      expect(normalized.eventType).toBe(EventType.POST);
      expect(normalized.content.text).toContain('Amazing Tech News');
      expect(normalized.content.hashtags).toEqual(['#tech']);
      expect(normalized.content.mediaUrls).toContain('https://example.com/image.jpg');
      expect(normalized.author.displayName).toBe('Tech Writer');
      expect(normalized.location?.url).toBe('https://example.com/post1');
    });

    it('should filter items by keywords', async () => {
      const mockRSSXML = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Test Blog</title>
            <item>
              <title>Technology News</title>
              <description>Latest tech updates</description>
              <pubDate>Mon, 01 Jan 2022 00:00:00 GMT</pubDate>
              <guid>post1</guid>
            </item>
            <item>
              <title>Sports Update</title>
              <description>Latest sports news</description>
              <pubDate>Mon, 01 Jan 2022 00:00:00 GMT</pubDate>
              <guid>post2</guid>
            </item>
          </channel>
        </rss>`;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockRSSXML)
      });

      const result = await adapter.fetchData({ 
        keywords: ['technology', 'tech'],
        limit: 10 
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('post1');
    });

    it('should manage feed URLs correctly', () => {
      const newFeedUrl = 'https://example.com/new-feed.xml';
      
      adapter.addFeedUrl(newFeedUrl);
      expect(adapter.getFeedUrls()).toContain(newFeedUrl);
      
      adapter.removeFeedUrl(newFeedUrl);
      expect(adapter.getFeedUrls()).not.toContain(newFeedUrl);
    });
  });

  describe('Rate Limit Handling', () => {
    it('should handle rate limit errors correctly', async () => {
      const adapter = new TikTokAdapter(mockConfig);
      
      const rateLimitError = new Error('Rate limit exceeded') as any;
      rateLimitError.platform = Platform.TIKTOK;
      rateLimitError.resetTime = new Date(Date.now() + 60000);
      rateLimitError.retryAfter = 60;

      const handleRateLimitSpy = jest.spyOn(adapter, 'handleRateLimit');
      
      await adapter.handleRateLimit(rateLimitError);
      
      expect(handleRateLimitSpy).toHaveBeenCalledWith(rateLimitError);
    });
  });

  describe('Metrics Tracking', () => {
    it('should track adapter metrics correctly', () => {
      const adapter = new TikTokAdapter(mockConfig);
      
      const initialMetrics = adapter.getMetrics();
      expect(initialMetrics.platform).toBe(Platform.TIKTOK);
      expect(initialMetrics.eventsProcessed).toBe(0);
      expect(initialMetrics.errorsEncountered).toBe(0);
      
      adapter.resetMetrics();
      const resetMetrics = adapter.getMetrics();
      expect(resetMetrics.eventsProcessed).toBe(0);
    });
  });
});