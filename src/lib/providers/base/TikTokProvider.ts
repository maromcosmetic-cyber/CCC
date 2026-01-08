import { CampaignProvider } from './CampaignProvider';

// TikTok Ads Campaign Provider
export interface TikTokProvider extends CampaignProvider {
  // TikTok-specific methods
  getVideoFormats(): Promise<any[]>;
  getPixelEvents(): Promise<any[]>;
  createVideoAd(config: any): Promise<any>;
}


