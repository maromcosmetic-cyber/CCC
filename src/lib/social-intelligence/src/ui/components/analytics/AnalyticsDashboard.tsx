/**
 * Analytics Dashboard Component
 * Main analytics interface for performance metrics, audience insights, and trending topics
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */

import React, { useState, useEffect } from 'react';
import { AnalyticsService } from '../../../analytics/AnalyticsService';
import { 
  ContentPerformance, 
  TopPerformingContent, 
  AudienceInsights, 
  SentimentTrend,
  AnalyticsFilters 
} from '../../../analytics/types';
import { Platform } from '../../../types/core';
import { PerformanceMetricsChart } from './PerformanceMetricsChart';
import { AudienceInsightsPanel } from './AudienceInsightsPanel';
import { TrendingTopicsWidget } from './TrendingTopicsWidget';
import { BenchmarkComparison } from './BenchmarkComparison';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';

export interface AnalyticsDashboardProps {
  /** Analytics service instance */
  analyticsService: AnalyticsService;
  /** Brand ID for analytics */
  brandId: string;
  /** Optional initial time range */
  initialTimeRange?: { start: Date; end: Date };
  /** Optional CSS class name */
  className?: string;
  /** Callback when data is loaded */
  onDataLoaded?: (data: any) => void;
}

export interface DashboardData {
  summary: {
    totalContent: number;
    totalEngagement: number;
    averageEngagementRate: number;
    totalReach: number;
    growthMetrics: {
      engagementGrowth: number;
      reachGrowth: number;
      contentVolumeGrowth: number;
    };
  };
  topPerformingContent: TopPerformingContent[];
  platformBreakdown: Record<Platform, {
    contentCount: number;
    totalEngagement: number;
    averageEngagementRate: number;
    reach: number;
  }>;
  audienceInsights: AudienceInsights;
  sentimentTrend: SentimentTrend;
  recentAlerts: Array<{
    type: 'performance' | 'sentiment' | 'engagement';
    message: string;
    severity: 'high' | 'medium' | 'low';
    timestamp: string;
  }>;
}

/**
 * Analytics Dashboard Component
 * Comprehensive analytics interface with performance metrics and insights
 */
export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  analyticsService,
  brandId,
  initialTimeRange,
  className = '',
  onDataLoaded
}) => {
  // State management
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<{ start: Date; end: Date }>(
    initialTimeRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date()
    }
  );
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([
    Platform.INSTAGRAM,
    Platform.TIKTOK,
    Platform.FACEBOOK,
    Platform.YOUTUBE
  ]);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);

  /**
   * Load dashboard data
   */
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await analyticsService.getAnalyticsDashboard(brandId, timeRange);
      setDashboardData(data);
      onDataLoaded?.(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics data';
      setError(errorMessage);
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle time range change
   */
  const handleTimeRangeChange = (newTimeRange: { start: Date; end: Date }) => {
    setTimeRange(newTimeRange);
  };

  /**
   * Handle platform filter change
   */
  const handlePlatformFilterChange = (platforms: Platform[]) => {
    setSelectedPlatforms(platforms);
  };

  /**
   * Refresh dashboard data
   */
  const refreshData = () => {
    loadDashboardData();
  };

  /**
   * Format number for display
   */
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  /**
   * Format percentage for display
   */
  const formatPercentage = (num: number): string => {
    return `${(num * 100).toFixed(2)}%`;
  };

  /**
   * Get growth indicator
   */
  const getGrowthIndicator = (growth: number) => {
    if (growth > 0) return { icon: '📈', color: '#10b981', text: `+${formatPercentage(growth)}` };
    if (growth < 0) return { icon: '📉', color: '#ef4444', text: formatPercentage(growth) };
    return { icon: '➡️', color: '#6b7280', text: '0%' };
  };

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadDashboardData();
  }, [brandId, timeRange]);

  // Set up auto-refresh
  useEffect(() => {
    if (refreshInterval) {
      const interval = setInterval(loadDashboardData, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  if (loading) {
    return (
      <div className={`analytics-dashboard ${className}`}>
        <LoadingSpinner 
          message="Loading analytics dashboard..." 
          size="large"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`analytics-dashboard ${className}`}>
        <ErrorMessage
          message={error}
          type="error"
          onDismiss={() => setError(null)}
        />
        <div className="analytics-dashboard__retry">
          <button 
            className="btn btn--primary"
            onClick={refreshData}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className={`analytics-dashboard ${className}`}>
        <div className="empty-state">
          <div className="empty-state__icon">📊</div>
          <h3>No Analytics Data</h3>
          <p>No analytics data available for the selected time range.</p>
          <button 
            className="btn btn--primary"
            onClick={refreshData}
          >
            🔄 Refresh Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`analytics-dashboard ${className}`}>
      {/* Dashboard Header */}
      <div className="analytics-dashboard__header">
        <div className="dashboard-header-content">
          <h2 className="dashboard-title">📊 Analytics Dashboard</h2>
          <p className="dashboard-subtitle">
            Performance insights and audience analytics for your social media content
          </p>
        </div>
        
        <div className="dashboard-controls">
          {/* Time Range Selector */}
          <div className="time-range-selector">
            <label htmlFor="time-range">Time Range:</label>
            <select 
              id="time-range"
              value="custom"
              onChange={(e) => {
                const value = e.target.value;
                const now = new Date();
                let start: Date;
                
                switch (value) {
                  case '7d':
                    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                  case '30d':
                    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                  case '90d':
                    start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    break;
                  default:
                    return;
                }
                
                handleTimeRangeChange({ start, end: now });
              }}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Refresh Controls */}
          <div className="refresh-controls">
            <button 
              className="btn btn--ghost btn--small"
              onClick={refreshData}
              title="Refresh data"
            >
              🔄 Refresh
            </button>
            
            <select 
              value={refreshInterval || ''}
              onChange={(e) => setRefreshInterval(e.target.value ? parseInt(e.target.value) : null)}
              className="auto-refresh-select"
            >
              <option value="">No auto-refresh</option>
              <option value="30">Every 30s</option>
              <option value="60">Every 1m</option>
              <option value="300">Every 5m</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {dashboardData.recentAlerts.length > 0 && (
        <div className="analytics-dashboard__alerts">
          <div className="alerts-header">
            <h3>🚨 Recent Alerts</h3>
          </div>
          <div className="alerts-list">
            {dashboardData.recentAlerts.slice(0, 3).map((alert, index) => (
              <div 
                key={index}
                className={`alert-item alert-item--${alert.severity}`}
              >
                <div className="alert-content">
                  <span className="alert-type">
                    {alert.type === 'performance' && '📈'}
                    {alert.type === 'sentiment' && '💭'}
                    {alert.type === 'engagement' && '👥'}
                  </span>
                  <span className="alert-message">{alert.message}</span>
                </div>
                <span className="alert-time">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="analytics-dashboard__summary">
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-card__header">
              <h3>📄 Total Content</h3>
              <span className="summary-card__icon">📊</span>
            </div>
            <div className="summary-card__value">
              {formatNumber(dashboardData.summary.totalContent)}
            </div>
            <div className="summary-card__growth">
              {(() => {
                const growth = getGrowthIndicator(dashboardData.summary.growthMetrics.contentVolumeGrowth);
                return (
                  <span style={{ color: growth.color }}>
                    {growth.icon} {growth.text}
                  </span>
                );
              })()}
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-card__header">
              <h3>👥 Total Engagement</h3>
              <span className="summary-card__icon">❤️</span>
            </div>
            <div className="summary-card__value">
              {formatNumber(dashboardData.summary.totalEngagement)}
            </div>
            <div className="summary-card__growth">
              {(() => {
                const growth = getGrowthIndicator(dashboardData.summary.growthMetrics.engagementGrowth);
                return (
                  <span style={{ color: growth.color }}>
                    {growth.icon} {growth.text}
                  </span>
                );
              })()}
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-card__header">
              <h3>📊 Engagement Rate</h3>
              <span className="summary-card__icon">📈</span>
            </div>
            <div className="summary-card__value">
              {formatPercentage(dashboardData.summary.averageEngagementRate)}
            </div>
            <div className="summary-card__growth">
              {(() => {
                const growth = getGrowthIndicator(dashboardData.summary.growthMetrics.engagementGrowth);
                return (
                  <span style={{ color: growth.color }}>
                    {growth.icon} {growth.text}
                  </span>
                );
              })()}
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-card__header">
              <h3>👁️ Total Reach</h3>
              <span className="summary-card__icon">🌐</span>
            </div>
            <div className="summary-card__value">
              {formatNumber(dashboardData.summary.totalReach)}
            </div>
            <div className="summary-card__growth">
              {(() => {
                const growth = getGrowthIndicator(dashboardData.summary.growthMetrics.reachGrowth);
                return (
                  <span style={{ color: growth.color }}>
                    {growth.icon} {growth.text}
                  </span>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="analytics-dashboard__content">
        {/* Performance Metrics Chart */}
        <div className="dashboard-section">
          <PerformanceMetricsChart
            analyticsService={analyticsService}
            brandId={brandId}
            timeRange={timeRange}
            selectedPlatforms={selectedPlatforms}
            onPlatformFilterChange={handlePlatformFilterChange}
          />
        </div>

        {/* Top Performing Content */}
        <div className="dashboard-section">
          <div className="section-header">
            <h3>🏆 Top Performing Content</h3>
            <p>Your best performing content across all platforms</p>
          </div>
          
          <div className="top-content-grid">
            {dashboardData.topPerformingContent.map((content, index) => (
              <div key={content.contentId} className="top-content-card">
                <div className="content-card__header">
                  <div className="content-rank">#{index + 1}</div>
                  <div className="content-platform">
                    {content.platform === Platform.INSTAGRAM && '📷'}
                    {content.platform === Platform.TIKTOK && '🎵'}
                    {content.platform === Platform.FACEBOOK && '👥'}
                    {content.platform === Platform.YOUTUBE && '📺'}
                    {content.platform}
                  </div>
                  <div className="content-score">
                    {content.performanceScore.toFixed(0)}/100
                  </div>
                </div>
                
                <div className="content-card__body">
                  <h4 className="content-title">{content.title}</h4>
                  <div className="content-type">{content.contentType}</div>
                  
                  <div className="content-metrics">
                    <div className="metric">
                      <span className="metric-icon">❤️</span>
                      <span className="metric-value">{formatNumber(content.metrics.likes)}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-icon">💬</span>
                      <span className="metric-value">{formatNumber(content.metrics.comments)}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-icon">🔄</span>
                      <span className="metric-value">{formatNumber(content.metrics.shares)}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-icon">👁️</span>
                      <span className="metric-value">{formatNumber(content.metrics.views)}</span>
                    </div>
                  </div>
                  
                  <div className="content-success-factors">
                    <h5>Success Factors:</h5>
                    <ul>
                      {content.successFactors.slice(0, 3).map((factor, idx) => (
                        <li key={idx}>{factor}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="content-card__footer">
                  <span className="content-date">
                    {new Date(content.publishedAt).toLocaleDateString()}
                  </span>
                  <span className="engagement-rate">
                    {formatPercentage(content.metrics.engagementRate)} engagement
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Breakdown */}
        <div className="dashboard-section">
          <div className="section-header">
            <h3>📱 Platform Performance</h3>
            <p>Performance breakdown by social media platform</p>
          </div>
          
          <div className="platform-breakdown-grid">
            {Object.entries(dashboardData.platformBreakdown).map(([platform, data]) => (
              <div key={platform} className="platform-card">
                <div className="platform-card__header">
                  <div className="platform-icon">
                    {platform === Platform.INSTAGRAM && '📷'}
                    {platform === Platform.TIKTOK && '🎵'}
                    {platform === Platform.FACEBOOK && '👥'}
                    {platform === Platform.YOUTUBE && '📺'}
                  </div>
                  <h4 className="platform-name">{platform}</h4>
                </div>
                
                <div className="platform-metrics">
                  <div className="platform-metric">
                    <span className="metric-label">Content</span>
                    <span className="metric-value">{data.contentCount}</span>
                  </div>
                  <div className="platform-metric">
                    <span className="metric-label">Engagement</span>
                    <span className="metric-value">{formatNumber(data.totalEngagement)}</span>
                  </div>
                  <div className="platform-metric">
                    <span className="metric-label">Rate</span>
                    <span className="metric-value">{formatPercentage(data.averageEngagementRate)}</span>
                  </div>
                  <div className="platform-metric">
                    <span className="metric-label">Reach</span>
                    <span className="metric-value">{formatNumber(data.reach)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audience Insights */}
        <div className="dashboard-section">
          <AudienceInsightsPanel
            audienceInsights={dashboardData.audienceInsights}
            className="audience-insights-section"
          />
        </div>

        {/* Trending Topics */}
        <div className="dashboard-section">
          <TrendingTopicsWidget
            sentimentTrend={dashboardData.sentimentTrend}
            className="trending-topics-section"
          />
        </div>

        {/* Benchmark Comparison */}
        <div className="dashboard-section">
          <BenchmarkComparison
            analyticsService={analyticsService}
            brandId={brandId}
            timeRange={timeRange}
            className="benchmark-section"
          />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;