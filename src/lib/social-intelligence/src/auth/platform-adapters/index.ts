/**
 * Platform Adapters Index
 * Factory function and exports for all platform-specific authentication adapters
 */

import { Platform } from '../../types/core';
import { PlatformAdapter } from '../types';
import { TikTokAuthAdapter } from './tiktok-adapter';
import { MetaAuthAdapter } from './meta-adapter';
import { YouTubeAuthAdapter } from './youtube-adapter';
import { RedditAuthAdapter } from './reddit-adapter';
import { RSSAuthAdapter } from './rss-adapter';

/**
 * Factory function to create appropriate platform adapter
 */
export function createPlatformAdapter(platform: Platform): PlatformAdapter {
  switch (platform) {
    case Platform.TIKTOK:
      return new TikTokAuthAdapter();
    case Platform.INSTAGRAM:
    case Platform.FACEBOOK:
      return new MetaAuthAdapter();
    case Platform.YOUTUBE:
      return new YouTubeAuthAdapter();
    case Platform.REDDIT:
      return new RedditAuthAdapter();
    case Platform.RSS:
      return new RSSAuthAdapter();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

// Export all adapters
export { TikTokAuthAdapter } from './tiktok-adapter';
export { MetaAuthAdapter } from './meta-adapter';
export { YouTubeAuthAdapter } from './youtube-adapter';
export { RedditAuthAdapter } from './reddit-adapter';
export { RSSAuthAdapter } from './rss-adapter';