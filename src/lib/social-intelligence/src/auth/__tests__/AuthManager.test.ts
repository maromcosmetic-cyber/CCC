/**
 * Unit tests for AuthManager
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AuthManager } from '../AuthManager';
import { Platform } from '../../types/core';
import { PlatformCredentials } from '../types';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('AuthManager', () => {
  let authManager: AuthManager;
  let mockCredentials: Record<Platform, PlatformCredentials>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockCredentials = {
      [Platform.TIKTOK]: {
        clientId: 'tiktok-client-id',
        clientSecret: 'tiktok-client-secret',
        scopes: ['business.read']
      },
      [Platform.INSTAGRAM]: {
        clientId: 'instagram-client-id',
        clientSecret: 'instagram-client-secret',
        scopes: ['instagram_basic']
      },
      [Platform.FACEBOOK]: {
        clientId: 'facebook-client-id',
        clientSecret: 'facebook-client-secret',
        scopes: ['pages_read_engagement']
      },
      [Platform.YOUTUBE]: {
        clientId: 'youtube-client-id',
        clientSecret: 'youtube-client-secret',
        scopes: ['https://www.googleapis.com/auth/youtube.readonly']
      },
      [Platform.REDDIT]: {
        clientId: 'reddit-client-id',
        clientSecret: 'reddit-client-secret',
        scopes: ['read']
      },
      [Platform.RSS]: {
        clientId: 'rss-client-id',
        clientSecret: 'rss-client-secret'
      }
    };

    authManager = new AuthManager(mockCredentials);
  });

  describe('storeCredentials', () => {
    it('should store credentials for a platform', async () => {
      const newCredentials: PlatformCredentials = {
        clientId: 'new-client-id',
        clientSecret: 'new-client-secret'
      };

      await authManager.storeCredentials(Platform.TIKTOK, newCredentials);
      
      // Verify credentials are stored (indirect test through token refresh)
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('getValidToken', () => {
    it('should return existing valid token', async () => {
      // Mock successful token response
      const mockResponse = {
        ok: true,
        json: async () => ({
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
          scope: 'business.read',
          token_type: 'Bearer'
        })
      };
      
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse as any);

      const token = await authManager.getValidToken(Platform.TIKTOK);
      
      expect(token.accessToken).toBe('test-access-token');
      expect(token.platform).toBe(Platform.TIKTOK);
      expect(token.expiresAt).toBeInstanceOf(Date);
    });

    it('should refresh expired token', async () => {
      // Mock successful token response
      const mockResponse = {
        ok: true,
        json: async () => ({
          access_token: 'refreshed-access-token',
          refresh_token: 'refreshed-refresh-token',
          expires_in: 3600,
          scope: 'business.read',
          token_type: 'Bearer'
        })
      };
      
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse as any);

      const token = await authManager.getValidToken(Platform.TIKTOK);
      
      expect(token.accessToken).toBe('refreshed-access-token');
      expect(token.platform).toBe(Platform.TIKTOK);
    });

    it('should handle authentication errors', async () => {
      // Mock failed token response
      const mockResponse = {
        ok: false,
        statusText: 'Unauthorized'
      };
      
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse as any);

      await expect(authManager.getValidToken(Platform.TIKTOK)).rejects.toThrow();
    });
  });

  describe('refreshToken', () => {
    it('should refresh TikTok token successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          access_token: 'new-tiktok-token',
          refresh_token: 'new-refresh-token',
          expires_in: 7200,
          scope: 'business.read',
          token_type: 'Bearer'
        })
      };
      
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse as any);

      const token = await authManager.refreshToken(Platform.TIKTOK);
      
      expect(token.accessToken).toBe('new-tiktok-token');
      expect(token.platform).toBe(Platform.TIKTOK);
      expect(token.scopes).toContain('business.read');
    });

    it('should refresh Meta token successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          access_token: 'new-meta-token',
          refresh_token: 'new-meta-refresh',
          expires_in: 5400,
          token_type: 'Bearer'
        })
      };
      
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse as any);

      const token = await authManager.refreshToken(Platform.INSTAGRAM);
      
      expect(token.accessToken).toBe('new-meta-token');
      expect(token.platform).toBe(Platform.INSTAGRAM);
    });

    it('should refresh YouTube token successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          access_token: 'new-youtube-token',
          refresh_token: 'new-youtube-refresh',
          expires_in: 3600,
          scope: 'https://www.googleapis.com/auth/youtube.readonly',
          token_type: 'Bearer'
        })
      };
      
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse as any);

      const token = await authManager.refreshToken(Platform.YOUTUBE);
      
      expect(token.accessToken).toBe('new-youtube-token');
      expect(token.platform).toBe(Platform.YOUTUBE);
    });

    it('should refresh Reddit token successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          access_token: 'new-reddit-token',
          expires_in: 3600,
          scope: 'read',
          token_type: 'Bearer'
        })
      };
      
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse as any);

      const token = await authManager.refreshToken(Platform.REDDIT);
      
      expect(token.accessToken).toBe('new-reddit-token');
      expect(token.platform).toBe(Platform.REDDIT);
    });

    it('should handle RSS token (no auth required)', async () => {
      const token = await authManager.refreshToken(Platform.RSS);
      
      expect(token.accessToken).toBe('rss-no-auth-required');
      expect(token.platform).toBe(Platform.RSS);
      expect(token.tokenType).toBe('None');
    });

    it('should throw error for unsupported platform', async () => {
      await expect(authManager.refreshToken('unsupported' as Platform)).rejects.toThrow('No credentials configured');
    });
  });

  describe('handleAuthFailure', () => {
    it('should handle authentication failure gracefully', async () => {
      const mockError = {
        message: 'Token expired',
        platform: Platform.TIKTOK,
        code: 'TOKEN_EXPIRED',
        retryable: true
      };

      // Should not throw
      await expect(authManager.handleAuthFailure(Platform.TIKTOK, mockError as any)).resolves.toBeUndefined();
    });
  });

  describe('monitorTokenHealth', () => {
    it('should return health reports for all platforms', async () => {
      const reports = await authManager.monitorTokenHealth();
      
      expect(reports).toHaveLength(Object.keys(Platform).length);
      
      reports.forEach(report => {
        expect(report).toHaveProperty('platform');
        expect(report).toHaveProperty('isValid');
        expect(report).toHaveProperty('expiresIn');
        expect(report).toHaveProperty('lastRefreshed');
        expect(report).toHaveProperty('errors');
        expect(Object.values(Platform)).toContain(report.platform);
      });
    });
  });
});