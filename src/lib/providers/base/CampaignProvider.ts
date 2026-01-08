// Campaign Provider Base Interface (for all ad platforms)

export interface CampaignConfig {
  name: string;
  description?: string;
  budget_amount: number;
  budget_currency: string;
  targeting: {
    audience_segment_id?: string;
    demographics?: any;
    interests?: any;
    behaviors?: any;
    geographic?: any;
  };
  start_date?: string;
  end_date?: string;
  creative_assets?: Array<{
    type: 'image' | 'video';
    url: string;
  }>;
}

export interface CampaignResult {
  campaign_id: string;
  external_campaign_id: string;
  status: string;
}

export interface CampaignDetails {
  id: string;
  external_campaign_id: string;
  name: string;
  status: string;
  budget: {
    amount: number;
    currency: string;
  };
  targeting: any;
  insights?: CampaignInsights;
}

export interface CampaignInsights {
  impressions?: number;
  clicks?: number;
  spend?: number;
  conversions?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  [key: string]: any;
}

export interface DateRange {
  start_date: string;
  end_date: string;
}

export interface Audience {
  id: string;
  name: string;
  description?: string;
  size?: number;
  targeting?: any;
}

export interface CampaignProvider {
  createCampaign(config: CampaignConfig): Promise<CampaignResult>;
  
  updateCampaign(
    campaignId: string,
    updates: Partial<CampaignConfig>
  ): Promise<CampaignResult>;
  
  getCampaign(campaignId: string): Promise<CampaignDetails>;
  
  getInsights(
    campaignId: string,
    dateRange: DateRange
  ): Promise<CampaignInsights>;
  
  getAudiences(): Promise<Audience[]>;
  
  syncCampaign(campaignId: string): Promise<void>;
  
  deleteCampaign(campaignId: string): Promise<void>;
  
  pauseCampaign(campaignId: string): Promise<void>;
  
  resumeCampaign(campaignId: string): Promise<void>;
}


