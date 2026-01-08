import { CampaignProvider } from './CampaignProvider';

// Lazada Campaign Provider
export interface LazadaProvider extends CampaignProvider {
  // Lazada-specific methods
  getProducts(): Promise<any[]>;
  createProductAd(productId: string, config: any): Promise<any>;
  getSellerCenterData(): Promise<any>;
}


