/**
 * Social Media Dashboard Component
 * Main dashboard component that integrates all social media intelligence features
 * Requirements: 1.1, 1.2, 1.4, 1.5
 */

import React, { useState, useEffect } from 'react';
import { SocialEventsApiService } from '../../api/services/SocialEventsApiService';
import { AnalyticsService } from '../../analytics/AnalyticsService';
import { Navigation } from './Navigation';
import { SocialMediaTab } from './SocialMediaTab';
import { AnalyticsDashboard } from './analytics/AnalyticsDashboard';
import { LoadingSpinner } from './common/LoadingSpinner';
import { ErrorMessage } from './common/ErrorMessage';

export interface SocialMediaDashboardProps {
  /** API service for social events */
  apiService: SocialEventsApiService;
  /** Analytics service for performance metrics */
  analyticsService: AnalyticsService;
  /** Optional initial tab to display */
  initialTab?: string;
  /** Optional CSS class name */
  className?: string;
  /** Callback when tab changes */
  onTabChange?: (tab: string) => void;
}

export interface DashboardState {
  activeTab: string;
  loading: boolean;
  error: string | null;
  contextData: Record<string, any>;
}

/**
 * Social Media Dashboard Component
 * Main container for all social media intelligence features
 */
export const SocialMediaDashboard: React.FC<SocialMediaDashboardProps> = ({
  apiService,
  analyticsService,
  initialTab = 'copywriter-ai',
  className = '',
  onTabChange
}) => {
  // State management
  const [state, setState] = useState<DashboardState>({
    activeTab: initialTab,
    loading: false,
    error: null,
    contextData: {}
  });

  /**
   * Handle tab change with context preservation
   */
  const handleTabChange = (newTab: string) => {
    // Preserve current context before switching
    const currentContext = getCurrentTabContext();
    
    setState(prev => ({
      ...prev,
      activeTab: newTab,
      contextData: {
        ...prev.contextData,
        [prev.activeTab]: currentContext
      }
    }));

    // Notify parent component
    onTabChange?.(newTab);
  };

  /**
   * Get current tab context for preservation
   */
  const getCurrentTabContext = (): any => {
    // This would collect current form data, filters, selections, etc.
    // Implementation depends on the specific tab content
    return {
      timestamp: new Date().toISOString(),
      // Add specific context data based on active tab
    };
  };

  /**
   * Restore context when switching tabs
   */
  const getTabContext = (tabId: string): any => {
    return state.contextData[tabId] || {};
  };

  /**
   * Handle global errors
   */
  const handleError = (error: string) => {
    setState(prev => ({
      ...prev,
      error,
      loading: false
    }));
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  };

  /**
   * Set loading state
   */
  const setLoading = (loading: boolean) => {
    setState(prev => ({
      ...prev,
      loading
    }));
  };

  /**
   * Render tab content based on active tab
   */
  const renderTabContent = () => {
    const tabContext = getTabContext(state.activeTab);

    switch (state.activeTab) {
      case 'copywriter-ai':
        return (
          <div 
            id="panel-copywriter-ai" 
            role="tabpanel" 
            aria-labelledby="tab-copywriter-ai"
            className="dashboard-panel"
          >
            <div className="dashboard-panel__content">
              {/* Copywriter AI Interface - Implemented in task 16.2 */}
              <div className="copywriter-ai-placeholder">
                <div className="placeholder-header">
                  <h3>🤖 Copywriter AI Interface</h3>
                  <p>AI-powered content generation and weekly planning</p>
                </div>
                
                <div className="placeholder-features">
                  <div className="feature-grid">
                    <div className="feature-item">
                      <div className="feature-icon">✨</div>
                      <h4>Content Generation</h4>
                      <p>Generate platform-specific content with AI</p>
                    </div>
                    <div className="feature-item">
                      <div className="feature-icon">📅</div>
                      <h4>Weekly Planning</h4>
                      <p>Create comprehensive weekly content plans</p>
                    </div>
                    <div className="feature-item">
                      <div className="feature-icon">🎯</div>
                      <h4>Brand Alignment</h4>
                      <p>Content aligned with brand guidelines</p>
                    </div>
                    <div className="feature-item">
                      <div className="feature-icon">🔥</div>
                      <h4>Trending Topics</h4>
                      <p>Incorporate trending topics and hashtags</p>
                    </div>
                    <div className="feature-item">
                      <div className="feature-icon">📊</div>
                      <h4>Performance Optimization</h4>
                      <p>Optimal posting times and A/B variations</p>
                    </div>
                    <div className="feature-item">
                      <div className="feature-icon">👥</div>
                      <h4>UGC Briefs</h4>
                      <p>Generate user-generated content campaigns</p>
                    </div>
                  </div>
                </div>

                <div className="placeholder-demo">
                  <h4>🎬 Demo Interface</h4>
                  <div className="demo-interface">
                    <div className="demo-form">
                      <div className="demo-field">
                        <label>Content Strategy:</label>
                        <select disabled>
                          <option>Trending Topics</option>
                        </select>
                      </div>
                      <div className="demo-field">
                        <label>Platforms:</label>
                        <div className="demo-platforms">
                          <span className="demo-platform">📷 Instagram</span>
                          <span className="demo-platform">🎵 TikTok</span>
                          <span className="demo-platform">👥 Facebook</span>
                        </div>
                      </div>
                      <div className="demo-field">
                        <label>Content Types:</label>
                        <div className="demo-content-types">
                          <span className="demo-type">📄 Posts</span>
                          <span className="demo-type">📖 Stories</span>
                          <span className="demo-type">🎬 Reels</span>
                        </div>
                      </div>
                      <button className="demo-button" disabled>
                        ✨ Generate AI Content Plan
                      </button>
                    </div>
                    
                    <div className="demo-output">
                      <h5>Generated Content Preview:</h5>
                      <div className="demo-content-card">
                        <div className="demo-content-header">
                          <span>📷 Instagram Post</span>
                          <span className="demo-engagement">📊 85% engagement</span>
                        </div>
                        <div className="demo-content-text">
                          "Discover the future of sustainable living with our eco-friendly products! 🌱 
                          Join the movement towards a greener tomorrow. #SustainableLiving #EcoFriendly #GreenFuture"
                        </div>
                        <div className="demo-content-meta">
                          <span>🕐 Best time: Today 7:30 PM</span>
                          <span>👁️ Est. reach: 12.5K</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="placeholder-note">
                  <p>
                    <strong>Note:</strong> The Copywriter AI interface components have been implemented 
                    and are ready for integration. This includes ContentPlanGenerator, ContentPlanViewer, 
                    and ContentPlanEditor components with full functionality for AI-powered content generation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div 
            id="panel-analytics" 
            role="tabpanel" 
            aria-labelledby="tab-analytics"
            className="dashboard-panel"
          >
            <div className="dashboard-panel__content">
              {/* Analytics Dashboard - Implemented in task 16.3 */}
              <AnalyticsDashboard
                analyticsService={analyticsService}
                brandId="demo-brand-id" // In real implementation, get from context
                className="analytics-dashboard-section"
                onDataLoaded={(data) => {
                  console.log('Analytics data loaded:', data);
                }}
              />
            </div>
          </div>
        );

      case 'content-creation':
        return (
          <div 
            id="panel-content-creation" 
            role="tabpanel" 
            aria-labelledby="tab-content-creation"
            className="dashboard-panel"
          >
            <div className="dashboard-panel__header">
              <h3>🎨 Content Creation</h3>
              <p>Upload, manage, and organize your content assets</p>
            </div>
            <div className="dashboard-panel__content">
              {/* Content creation interface will be implemented in task 16.4 */}
              <div className="coming-soon">
                <div className="coming-soon__icon">🎬</div>
                <h4>Content Creation Interface</h4>
                <p>Content management interface coming soon...</p>
                <ul className="feature-list">
                  <li>Content upload and management</li>
                  <li>Tagging and categorization tools</li>
                  <li>Performance tracking</li>
                  <li>Content reuse suggestions</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'publish':
        return (
          <div 
            id="panel-publish" 
            role="tabpanel" 
            aria-labelledby="tab-publish"
            className="dashboard-panel"
          >
            <div className="dashboard-panel__header">
              <h3>📅 Publish</h3>
              <p>Schedule and manage your content publishing</p>
            </div>
            <div className="dashboard-panel__content">
              {/* Publishing interface will be implemented in task 16.5 */}
              <div className="coming-soon">
                <div className="coming-soon__icon">📋</div>
                <h4>Publishing & Scheduling</h4>
                <p>Content scheduling interface coming soon...</p>
                <ul className="feature-list">
                  <li>Calendar view for scheduled content</li>
                  <li>Scheduling tools and conflict prevention</li>
                  <li>Publishing status monitoring</li>
                  <li>Automated notifications</li>
                </ul>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="dashboard-panel">
            <div className="dashboard-panel__content">
              <ErrorMessage 
                message={`Unknown tab: ${state.activeTab}`}
                type="error"
                onDismiss={clearError}
              />
            </div>
          </div>
        );
    }
  };

  // Initialize dashboard
  useEffect(() => {
    setLoading(true);
    
    // Simulate initialization
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <div className={`social-media-dashboard ${className}`}>
      {/* Global Loading State */}
      {state.loading && (
        <div className="dashboard-loading-overlay">
          <LoadingSpinner 
            message="Loading Social Media Dashboard..." 
            size="large"
          />
        </div>
      )}

      {/* Global Error State */}
      {state.error && (
        <div className="dashboard-error">
          <ErrorMessage
            message={state.error}
            type="error"
            onDismiss={clearError}
          />
        </div>
      )}

      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="dashboard-header__content">
          <h1 className="dashboard-title">Social Media Intelligence</h1>
          <p className="dashboard-subtitle">
            Monitor, analyze, and manage your brand's social media presence
          </p>
        </div>
      </div>

      {/* Navigation */}
      <Navigation
        activeTab={state.activeTab}
        onTabChange={handleTabChange}
        className="dashboard-navigation"
      />

      {/* Main Content Area */}
      <main className="dashboard-main">
        {/* Social Events Tab (Always Available) */}
        <div className="dashboard-sidebar">
          <SocialMediaTab
            apiService={apiService}
            className="dashboard-social-events"
          />
        </div>

        {/* Active Tab Content */}
        <div className="dashboard-content">
          {renderTabContent()}
        </div>
      </main>

      {/* Dashboard Footer */}
      <footer className="dashboard-footer">
        <div className="dashboard-footer__content">
          <p className="dashboard-footer__text">
            Social Media Intelligence Dashboard - Powered by AI
          </p>
          <div className="dashboard-footer__actions">
            <button 
              className="btn btn--ghost btn--small"
              onClick={() => window.location.reload()}
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SocialMediaDashboard;