/**
 * Dashboard Integration Example
 * Shows how to integrate the Social Media Dashboard with CCC
 * Requirements: 1.1, 1.2, 1.4, 1.5
 */

import React from 'react';
import { SocialMediaDashboard } from '../components/SocialMediaDashboard';
import { SocialEventsApiService } from '../../api/services/SocialEventsApiService';

/**
 * Example integration component showing how to use the Social Media Dashboard
 * in the CCC system
 */
export const DashboardExample: React.FC = () => {
  // In a real implementation, this would be injected or configured
  const apiService = new SocialEventsApiService({
    baseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001',
    apiKey: process.env.REACT_APP_API_KEY || 'demo-key'
  });

  /**
   * Handle tab changes for analytics or external integrations
   */
  const handleTabChange = (tab: string) => {
    console.log(`Switched to tab: ${tab}`);
    
    // Example: Track tab usage for analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'tab_change', {
        event_category: 'social_media_dashboard',
        event_label: tab
      });
    }
  };

  return (
    <div className="ccc-social-media-integration">
      {/* Include the CSS styles */}
      <link 
        rel="stylesheet" 
        href="/src/lib/social-intelligence/src/ui/styles/social-intelligence.css" 
      />
      
      {/* Main Dashboard Component */}
      <SocialMediaDashboard
        apiService={apiService}
        initialTab="copywriter-ai"
        onTabChange={handleTabChange}
        className="ccc-dashboard"
      />
    </div>
  );
};

/**
 * Example of how to integrate with existing CCC tab system
 */
export const CCCTabIntegration: React.FC = () => {
  return (
    <div className="ccc-tab-content">
      <DashboardExample />
    </div>
  );
};

export default DashboardExample;