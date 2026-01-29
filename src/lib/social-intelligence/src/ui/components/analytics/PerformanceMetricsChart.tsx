/**
 * Performance Metrics Chart Component
 * Interactive chart for visualizing content performance metrics over time
 * Requirements: 8.1, 8.2, 8.3
 */

import React, { useState, useEffect } from 'react';
import { AnalyticsService } from '../../../analytics/AnalyticsService';
import { Platform } from '../../../types/core';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';

export interface PerformanceMetricsChartProps {
  /** Analytics service instance */
  analyticsService: AnalyticsService;
  /** Brand ID for analytics */
  brandId: string;
  /** Time range for the chart */
  timeRange: { start: Date; end: Date };
  /** Selected platforms to display */
  selectedPlatforms: Platform[];
  /** Callback when platform filter changes */
  onPlatformFilterChange: (platforms: Platform[]) => void;
  /** Optional CSS class name */
  className?: string;
}

export interface ChartData {
  date: string;
  contentCount: number;
  totalEngagement: number;
  averageEngagementRate: number;
  reach: number;
  platformBreakdown: Record<Platform, number>;
}

/**
 * Performance Metrics Chart Component
 * Displays performance trends with interactive filtering
 */
export const PerformanceMetricsChart: React.FC<PerformanceMetricsChartProps> = ({
  analyticsService,
  brandId,
  timeRange,
  selectedPlatforms,
  onPlatformFilterChange,
  className = ''
}) => {
  // State management
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'engagement' | 'reach' | 'content'>('engagement');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  /**
   * Load performance trends data
   */
  const loadPerformanceTrends = async () => {
    try {
      setLoading(true);
      setError(null);

      const trends = await analyticsService.getContentPerformanceTrends(
        brandId,
        timeRange,
        'daily'
      );

      setChartData(trends);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load performance trends';
      setError(errorMessage);
      console.error('Error loading performance trends:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle platform toggle
   */
  const handlePlatformToggle = (platform: Platform) => {
    const newPlatforms = selectedPlatforms.includes(platform)
      ? selectedPlatforms.filter(p => p !== platform)
      : [...selectedPlatforms, platform];
    
    onPlatformFilterChange(newPlatforms);
  };

  /**
   * Get metric value for display
   */
  const getMetricValue = (data: ChartData): number => {
    switch (selectedMetric) {
      case 'engagement':
        return data.totalEngagement;
      case 'reach':
        return data.reach;
      case 'content':
        return data.contentCount;
      default:
        return 0;
    }
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
   * Get platform color
   */
  const getPlatformColor = (platform: Platform): string => {
    const colors = {
      [Platform.INSTAGRAM]: '#E4405F',
      [Platform.TIKTOK]: '#000000',
      [Platform.FACEBOOK]: '#1877F2',
      [Platform.YOUTUBE]: '#FF0000',
      [Platform.TWITTER]: '#1DA1F2',
      [Platform.LINKEDIN]: '#0A66C2'
    };
    return colors[platform] || '#6b7280';
  };

  /**
   * Render simple chart visualization
   */
  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="chart-empty">
          <div className="chart-empty__icon">📊</div>
          <p>No data available for the selected time range</p>
        </div>
      );
    }

    const maxValue = Math.max(...chartData.map(getMetricValue));
    const minValue = Math.min(...chartData.map(getMetricValue));
    const range = maxValue - minValue || 1;

    return (
      <div className="chart-container">
        {chartType === 'line' ? (
          <div className="line-chart">
            <div className="chart-grid">
              {/* Y-axis labels */}
              <div className="y-axis">
                <div className="y-axis-label">{formatNumber(maxValue)}</div>
                <div className="y-axis-label">{formatNumber(maxValue * 0.75)}</div>
                <div className="y-axis-label">{formatNumber(maxValue * 0.5)}</div>
                <div className="y-axis-label">{formatNumber(maxValue * 0.25)}</div>
                <div className="y-axis-label">{formatNumber(minValue)}</div>
              </div>
              
              {/* Chart area */}
              <div className="chart-area">
                <svg className="chart-svg" viewBox="0 0 800 300">
                  {/* Grid lines */}
                  {[0, 1, 2, 3, 4].map(i => (
                    <line
                      key={`grid-${i}`}
                      x1="0"
                      y1={i * 75}
                      x2="800"
                      y2={i * 75}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                  ))}
                  
                  {/* Data line */}
                  <polyline
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    points={chartData.map((data, index) => {
                      const x = (index / (chartData.length - 1)) * 800;
                      const y = 300 - ((getMetricValue(data) - minValue) / range) * 300;
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                  
                  {/* Data points */}
                  {chartData.map((data, index) => {
                    const x = (index / (chartData.length - 1)) * 800;
                    const y = 300 - ((getMetricValue(data) - minValue) / range) * 300;
                    return (
                      <circle
                        key={`point-${index}`}
                        cx={x}
                        cy={y}
                        r="4"
                        fill="#3b82f6"
                        className="chart-point"
                      />
                    );
                  })}
                </svg>
              </div>
            </div>
            
            {/* X-axis labels */}
            <div className="x-axis">
              {chartData.map((data, index) => (
                <div key={`x-label-${index}`} className="x-axis-label">
                  {new Date(data.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bar-chart">
            <div className="chart-bars">
              {chartData.map((data, index) => {
                const height = ((getMetricValue(data) - minValue) / range) * 100;
                return (
                  <div key={`bar-${index}`} className="chart-bar-container">
                    <div 
                      className="chart-bar"
                      style={{ 
                        height: `${height}%`,
                        backgroundColor: '#3b82f6'
                      }}
                      title={`${data.date}: ${formatNumber(getMetricValue(data))}`}
                    />
                    <div className="bar-label">
                      {new Date(data.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Load data when dependencies change
  useEffect(() => {
    loadPerformanceTrends();
  }, [brandId, timeRange]);

  if (loading) {
    return (
      <div className={`performance-metrics-chart ${className}`}>
        <LoadingSpinner message="Loading performance metrics..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`performance-metrics-chart ${className}`}>
        <ErrorMessage
          message={error}
          type="error"
          onDismiss={() => setError(null)}
        />
      </div>
    );
  }

  return (
    <div className={`performance-metrics-chart ${className}`}>
      {/* Chart Header */}
      <div className="chart-header">
        <div className="chart-title-section">
          <h3>📈 Performance Trends</h3>
          <p>Track your content performance over time</p>
        </div>
        
        <div className="chart-controls">
          {/* Metric Selector */}
          <div className="metric-selector">
            <label htmlFor="metric-select">Metric:</label>
            <select
              id="metric-select"
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
            >
              <option value="engagement">Total Engagement</option>
              <option value="reach">Total Reach</option>
              <option value="content">Content Count</option>
            </select>
          </div>
          
          {/* Chart Type Selector */}
          <div className="chart-type-selector">
            <button
              className={`chart-type-btn ${chartType === 'line' ? 'active' : ''}`}
              onClick={() => setChartType('line')}
              title="Line Chart"
            >
              📈
            </button>
            <button
              className={`chart-type-btn ${chartType === 'bar' ? 'active' : ''}`}
              onClick={() => setChartType('bar')}
              title="Bar Chart"
            >
              📊
            </button>
          </div>
        </div>
      </div>

      {/* Platform Filters */}
      <div className="platform-filters">
        <span className="filter-label">Platforms:</span>
        <div className="platform-filter-buttons">
          {Object.values(Platform).map(platform => (
            <button
              key={platform}
              className={`platform-filter-btn ${selectedPlatforms.includes(platform) ? 'active' : ''}`}
              onClick={() => handlePlatformToggle(platform)}
              style={{
                borderColor: selectedPlatforms.includes(platform) ? getPlatformColor(platform) : '#d1d5db',
                backgroundColor: selectedPlatforms.includes(platform) ? getPlatformColor(platform) : 'transparent',
                color: selectedPlatforms.includes(platform) ? 'white' : getPlatformColor(platform)
              }}
            >
              {platform === Platform.INSTAGRAM && '📷'}
              {platform === Platform.TIKTOK && '🎵'}
              {platform === Platform.FACEBOOK && '👥'}
              {platform === Platform.YOUTUBE && '📺'}
              {platform === Platform.TWITTER && '🐦'}
              {platform === Platform.LINKEDIN && '💼'}
              {platform}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Visualization */}
      <div className="chart-section">
        {renderChart()}
      </div>

      {/* Chart Summary */}
      <div className="chart-summary">
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="stat-label">Total Data Points:</span>
            <span className="stat-value">{chartData.length}</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Peak Value:</span>
            <span className="stat-value">
              {chartData.length > 0 ? formatNumber(Math.max(...chartData.map(getMetricValue))) : '0'}
            </span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Average:</span>
            <span className="stat-value">
              {chartData.length > 0 
                ? formatNumber(chartData.reduce((sum, data) => sum + getMetricValue(data), 0) / chartData.length)
                : '0'
              }
            </span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Trend:</span>
            <span className="stat-value">
              {chartData.length >= 2 ? (
                getMetricValue(chartData[chartData.length - 1]) > getMetricValue(chartData[0]) ? '📈 Up' : '📉 Down'
              ) : '➡️ Stable'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetricsChart;