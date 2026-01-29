/**
 * Benchmark Comparison Component
 * Compare performance against industry benchmarks and competitors
 * Requirements: 8.6
 */

import React, { useState, useEffect } from 'react';
import { AnalyticsService } from '../../../analytics/AnalyticsService';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';

export interface BenchmarkComparisonProps {
  /** Analytics service instance */
  analyticsService: AnalyticsService;
  /** Brand ID for comparison */
  brandId: string;
  /** Time range for comparison */
  timeRange: { start: Date; end: Date };
  /** Optional CSS class name */
  className?: string;
}

export interface BenchmarkData {
  brandPerformance: {
    engagementRate: number;
    reach: number;
    contentVolume: number;
  };
  industryBenchmarks: Array<{
    metric: string;
    brandValue: number;
    industryAverage: number;
    percentageDifference: number;
    performance: 'above' | 'below' | 'at' | 'no_data';
  }>;
  competitorComparisons: Array<{
    competitor: string;
    engagementRate: number;
    contentVolume: number;
    reach: number;
    performanceGap: number;
  }>;
  recommendations: string[];
}

/**
 * Benchmark Comparison Component
 * Displays performance comparisons against industry standards and competitors
 */
export const BenchmarkComparison: React.FC<BenchmarkComparisonProps> = ({
  analyticsService,
  brandId,
  timeRange,
  className = ''
}) => {
  // State management
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState('beauty');
  const [competitors, setCompetitors] = useState<string[]>(['Competitor A', 'Competitor B', 'Competitor C']);
  const [activeTab, setActiveTab] = useState<'industry' | 'competitors' | 'recommendations'>('industry');

  /**
   * Load benchmark data
   */
  const loadBenchmarkData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load industry benchmarks
      const industryData = await analyticsService.generateBenchmarkReport(
        brandId,
        selectedIndustry,
        timeRange
      );

      // Load competitor analysis
      const competitorData = await analyticsService.getCompetitorAnalysis(
        brandId,
        competitors,
        timeRange
      );

      // Combine data
      const combinedData: BenchmarkData = {
        brandPerformance: industryData.brandPerformance,
        industryBenchmarks: industryData.comparisons,
        competitorComparisons: competitorData.competitorComparisons,
        recommendations: [...industryData.recommendations, ...competitorData.insights]
      };

      setBenchmarkData(combinedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load benchmark data';
      setError(errorMessage);
      console.error('Error loading benchmark data:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Format percentage for display
   */
  const formatPercentage = (num: number): string => {
    return `${(num * 100).toFixed(2)}%`;
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
   * Get performance indicator
   */
  const getPerformanceIndicator = (performance: string) => {
    switch (performance) {
      case 'above':
        return { icon: '📈', color: '#10b981', text: 'Above Average' };
      case 'below':
        return { icon: '📉', color: '#ef4444', text: 'Below Average' };
      case 'at':
        return { icon: '➡️', color: '#6b7280', text: 'At Average' };
      default:
        return { icon: '❓', color: '#6b7280', text: 'No Data' };
    }
  };

  /**
   * Get difference color
   */
  const getDifferenceColor = (difference: number): string => {
    if (difference > 0) return '#10b981';
    if (difference < 0) return '#ef4444';
    return '#6b7280';
  };

  /**
   * Render industry benchmarks tab
   */
  const renderIndustryBenchmarks = () => {
    if (!benchmarkData) return null;

    return (
      <div className="industry-benchmarks">
        <div className="benchmarks-header">
          <h4>📊 Industry Benchmarks</h4>
          <div className="industry-selector">
            <label htmlFor="industry-select">Industry:</label>
            <select
              id="industry-select"
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
            >
              <option value="beauty">Beauty & Cosmetics</option>
              <option value="fashion">Fashion & Apparel</option>
              <option value="food">Food & Beverage</option>
              <option value="tech">Technology</option>
              <option value="health">Health & Wellness</option>
              <option value="retail">Retail</option>
            </select>
          </div>
        </div>

        <div className="benchmark-metrics">
          {benchmarkData.industryBenchmarks.map((benchmark, index) => {
            const indicator = getPerformanceIndicator(benchmark.performance);
            return (
              <div key={index} className="benchmark-metric">
                <div className="metric-header">
                  <div className="metric-name">{benchmark.metric}</div>
                  <div className="performance-indicator">
                    <span className="indicator-icon">{indicator.icon}</span>
                    <span 
                      className="indicator-text"
                      style={{ color: indicator.color }}
                    >
                      {indicator.text}
                    </span>
                  </div>
                </div>
                
                <div className="metric-comparison">
                  <div className="comparison-bars">
                    <div className="comparison-bar">
                      <div className="bar-label">Your Brand</div>
                      <div className="bar-container">
                        <div 
                          className="bar-fill brand-bar"
                          style={{ 
                            width: `${Math.min((benchmark.brandValue / Math.max(benchmark.brandValue, benchmark.industryAverage)) * 100, 100)}%`,
                            backgroundColor: '#3b82f6'
                          }}
                        />
                      </div>
                      <div className="bar-value">
                        {benchmark.metric.includes('Rate') 
                          ? formatPercentage(benchmark.brandValue)
                          : formatNumber(benchmark.brandValue)
                        }
                      </div>
                    </div>
                    
                    <div className="comparison-bar">
                      <div className="bar-label">Industry Average</div>
                      <div className="bar-container">
                        <div 
                          className="bar-fill industry-bar"
                          style={{ 
                            width: `${Math.min((benchmark.industryAverage / Math.max(benchmark.brandValue, benchmark.industryAverage)) * 100, 100)}%`,
                            backgroundColor: '#6b7280'
                          }}
                        />
                      </div>
                      <div className="bar-value">
                        {benchmark.metric.includes('Rate') 
                          ? formatPercentage(benchmark.industryAverage)
                          : formatNumber(benchmark.industryAverage)
                        }
                      </div>
                    </div>
                  </div>
                  
                  <div className="difference-indicator">
                    <span 
                      className="difference-value"
                      style={{ color: getDifferenceColor(benchmark.percentageDifference) }}
                    >
                      {benchmark.percentageDifference > 0 ? '+' : ''}
                      {benchmark.percentageDifference.toFixed(1)}%
                    </span>
                    <span className="difference-label">vs industry</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {benchmarkData.industryBenchmarks.length === 0 && (
          <div className="empty-benchmarks">
            <div className="empty-icon">📊</div>
            <p>No industry benchmark data available for {selectedIndustry}</p>
          </div>
        )}
      </div>
    );
  };

  /**
   * Render competitor comparison tab
   */
  const renderCompetitorComparison = () => {
    if (!benchmarkData) return null;

    return (
      <div className="competitor-comparison">
        <div className="competitors-header">
          <h4>🏆 Competitor Analysis</h4>
          <p>Compare your performance against key competitors</p>
        </div>

        <div className="competitor-metrics">
          {benchmarkData.competitorComparisons.map((competitor, index) => (
            <div key={index} className="competitor-card">
              <div className="competitor-header">
                <div className="competitor-name">{competitor.competitor}</div>
                <div className="performance-gap">
                  <span 
                    className="gap-value"
                    style={{ color: getDifferenceColor(competitor.performanceGap) }}
                  >
                    {competitor.performanceGap > 0 ? '+' : ''}
                    {formatPercentage(competitor.performanceGap)} gap
                  </span>
                </div>
              </div>
              
              <div className="competitor-stats">
                <div className="stat-item">
                  <div className="stat-label">Engagement Rate</div>
                  <div className="stat-comparison">
                    <div className="stat-value yours">
                      {formatPercentage(benchmarkData.brandPerformance.engagementRate)}
                    </div>
                    <div className="stat-vs">vs</div>
                    <div className="stat-value theirs">
                      {formatPercentage(competitor.engagementRate)}
                    </div>
                  </div>
                </div>
                
                <div className="stat-item">
                  <div className="stat-label">Content Volume</div>
                  <div className="stat-comparison">
                    <div className="stat-value yours">
                      {benchmarkData.brandPerformance.contentVolume}
                    </div>
                    <div className="stat-vs">vs</div>
                    <div className="stat-value theirs">
                      {competitor.contentVolume}
                    </div>
                  </div>
                </div>
                
                <div className="stat-item">
                  <div className="stat-label">Reach</div>
                  <div className="stat-comparison">
                    <div className="stat-value yours">
                      {formatNumber(benchmarkData.brandPerformance.reach)}
                    </div>
                    <div className="stat-vs">vs</div>
                    <div className="stat-value theirs">
                      {formatNumber(competitor.reach)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {benchmarkData.competitorComparisons.length === 0 && (
          <div className="empty-competitors">
            <div className="empty-icon">🏆</div>
            <p>No competitor data available</p>
          </div>
        )}
      </div>
    );
  };

  /**
   * Render recommendations tab
   */
  const renderRecommendations = () => {
    if (!benchmarkData) return null;

    return (
      <div className="recommendations">
        <div className="recommendations-header">
          <h4>💡 Recommendations</h4>
          <p>Actionable insights to improve your performance</p>
        </div>

        <div className="recommendations-list">
          {benchmarkData.recommendations.map((recommendation, index) => (
            <div key={index} className="recommendation-item">
              <div className="recommendation-icon">💡</div>
              <div className="recommendation-content">
                <p>{recommendation}</p>
              </div>
            </div>
          ))}
        </div>

        {benchmarkData.recommendations.length === 0 && (
          <div className="empty-recommendations">
            <div className="empty-icon">💡</div>
            <p>No recommendations available at this time</p>
          </div>
        )}
      </div>
    );
  };

  // Load data when dependencies change
  useEffect(() => {
    loadBenchmarkData();
  }, [brandId, timeRange, selectedIndustry]);

  if (loading) {
    return (
      <div className={`benchmark-comparison ${className}`}>
        <LoadingSpinner message="Loading benchmark data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`benchmark-comparison ${className}`}>
        <ErrorMessage
          message={error}
          type="error"
          onDismiss={() => setError(null)}
        />
        <div className="benchmark-retry">
          <button 
            className="btn btn--primary"
            onClick={loadBenchmarkData}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`benchmark-comparison ${className}`}>
      {/* Component Header */}
      <div className="benchmark-header">
        <div className="header-content">
          <h3>📊 Benchmark Comparison</h3>
          <p>Compare your performance against industry standards and competitors</p>
        </div>
        
        <div className="header-actions">
          <button 
            className="btn btn--ghost btn--small"
            onClick={loadBenchmarkData}
            title="Refresh benchmark data"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="benchmark-tabs">
        <button
          className={`benchmark-tab ${activeTab === 'industry' ? 'active' : ''}`}
          onClick={() => setActiveTab('industry')}
        >
          📊 Industry
        </button>
        <button
          className={`benchmark-tab ${activeTab === 'competitors' ? 'active' : ''}`}
          onClick={() => setActiveTab('competitors')}
        >
          🏆 Competitors
        </button>
        <button
          className={`benchmark-tab ${activeTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          💡 Insights
        </button>
      </div>

      {/* Tab Content */}
      <div className="benchmark-content">
        {activeTab === 'industry' && renderIndustryBenchmarks()}
        {activeTab === 'competitors' && renderCompetitorComparison()}
        {activeTab === 'recommendations' && renderRecommendations()}
      </div>

      {/* Performance Summary */}
      {benchmarkData && (
        <div className="benchmark-summary">
          <h4>📈 Performance Summary</h4>
          <div className="summary-grid">
            <div className="summary-item">
              <div className="summary-label">Your Engagement Rate</div>
              <div className="summary-value">
                {formatPercentage(benchmarkData.brandPerformance.engagementRate)}
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Content Volume</div>
              <div className="summary-value">
                {benchmarkData.brandPerformance.contentVolume} posts
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Total Reach</div>
              <div className="summary-value">
                {formatNumber(benchmarkData.brandPerformance.reach)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BenchmarkComparison;