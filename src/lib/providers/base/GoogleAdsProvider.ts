import { CampaignProvider } from './CampaignProvider';

// Google Ads Campaign Provider
export interface GoogleAdsProvider extends CampaignProvider {
  // Google Ads-specific methods
  createAdGroup(campaignId: string, config: any): Promise<any>;
  getKeywords(suggestion?: string): Promise<any[]>;
  getNetworks(): Promise<string[]>;
}


