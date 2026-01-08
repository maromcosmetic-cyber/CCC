import { CampaignProvider, CampaignConfig, CampaignResult, CampaignDetails, CampaignInsights, DateRange, Audience } from './CampaignProvider';

// Meta (Facebook/Instagram) Campaign Provider
export interface MetaProvider extends CampaignProvider {
  // Meta-specific methods can be added here
  createAdSet(campaignId: string, config: any): Promise<any>;
  getPlacements(): Promise<any[]>;
}


