// Scraper Provider Interface

export interface ScrapeConfig {
  max_pages?: number;
  include_legal?: boolean;
  timeout?: number;
}

export interface ScrapeResult {
  url: string;
  title?: string;
  content: string;
  html_content?: string;
  page_type?: 'home' | 'product' | 'legal' | 'about' | 'contact' | 'other';
  metadata?: Record<string, any>;
}

export interface ScraperProvider {
  scrape(url: string, config: ScrapeConfig): Promise<ScrapeResult[]>;
}


