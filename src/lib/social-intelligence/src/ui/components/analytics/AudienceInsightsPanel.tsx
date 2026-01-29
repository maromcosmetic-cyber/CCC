/**
 * Audience Insights Panel Component
 * Display audience demographics, behavior patterns, and interests
 * Requirements: 8.4, 8.5
 */

import React, { useState } from 'react';
import { AudienceInsights } from '../../../analytics/types';
import { Platform, ContentType } from '../../../types/core';

export interface AudienceInsightsPanelProps {
  /** Audience insights data */
  audienceInsights: AudienceInsights;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Audience Insights Panel Component
 * Comprehensive display of audience analytics and behavior patterns
 */
export const AudienceInsightsPanel: React.FC<AudienceInsightsPanelProps> = ({
  audienceInsights,
  className = ''
}) => {
  // State for active tab
  const [activeTab, setActiveTab] = useState<'demographics' | 'behavior' | 'interests'>('demographics');

  /**
   * Format percentage for display
   */
  const formatPercentage = (num: number): string => {
    return `${num.toFixed(1)}%`;
  };

  /**
   * Format engagement rate for display
   */
  const formatEngagementRate = (rate: number): string => {
    return `${(rate * 100).toFixed(2)}%`;
  };

  /**
   * Get demographic color based on percentage
   */
  const getDemographicColor = (percentage: number): string => {
    if (percentage >= 30) return '#10b981'; // Green for high
    if (percentage >= 15) return '#f59e0b'; // Yellow for medium
    return '#6b7280'; // Gray for low
  };

  /**
   * Render demographics tab
   */
  const renderDemographics = () => (
    <div className="demographics-content">
      {/* Age Groups */}
      <div className="demographic-section">
        <h4>👥 Age Groups</h4>
        <div className="demographic-bars">
          {Object.entries(audienceInsights.demographics.ageGroups).map(([ageGroup, data]) => (
            <div key={ageGroup} className="demographic-bar-item">
              <div className="demographic-label">
                <span className="age-group">{ageGroup}</span>
                <span className="percentage">{formatPercentage(data.percentage)}</span>
              </div>
              <div className="demographic-bar-container">
                <div 
                  className="demographic-bar"
                  style={{ 
                    width: `${data.percentage}%`,
                    backgroundColor: getDemographicColor(data.percentage)
                  }}
                />
              </div>
              <div className="engagement-info">
                <span className="engagement-rate">
                  {formatEngagementRate(data.engagementRate)} engagement
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gender Breakdown */}
      <div className="demographic-section">
        <h4>⚧ Gender Breakdown</h4>
        <div className="gender-breakdown">
          {Object.entries(audienceInsights.demographics.genderBreakdown).map(([gender, data]) => (
            <div key={gender} className="gender-item">
              <div className="gender-icon">
                {gender.toLowerCase() === 'male' && '👨'}
                {gender.toLowerCase() === 'female' && '👩'}
                {gender.toLowerCase() === 'other' && '🧑'}
                {!['male', 'female', 'other'].includes(gender.toLowerCase()) && '👤'}
              </div>
              <div className="gender-info">
                <div className="gender-label">{gender}</div>
                <div className="gender-percentage">{formatPercentage(data.percentage)}</div>
                <div className="gender-engagement">
                  {formatEngagementRate(data.engagementRate)} engagement
                </div>
              </div>
              <div className="gender-visual">
                <div 
                  className="gender-circle"
                  style={{ 
                    width: `${Math.max(data.percentage * 2, 20)}px`,
                    height: `${Math.max(data.percentage * 2, 20)}px`,
                    backgroundColor: getDemographicColor(data.percentage)
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Locations */}
      <div className="demographic-section">
        <h4>🌍 Top Locations</h4>
        <div className="locations-list">
          {audienceInsights.demographics.topLocations.slice(0, 10).map((location, index) => (
            <div key={location.location} className="location-item">
              <div className="location-rank">#{index + 1}</div>
              <div className="location-info">
                <div className="location-name">{location.location}</div>
                <div className="location-stats">
                  <span className="location-percentage">{formatPercentage(location.percentage)}</span>
                  <span className="location-engagement">
                    {formatEngagementRate(location.engagementRate)} engagement
                  </span>
                </div>
              </div>
              <div className="location-bar">
                <div 
                  className="location-bar-fill"
                  style={{ 
                    width: `${location.percentage}%`,
                    backgroundColor: getDemographicColor(location.percentage)
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /**
   * Render behavior patterns tab
   */
  const renderBehavior = () => (
    <div className="behavior-content">
      {/* Peak Engagement Hours */}
      <div className="behavior-section">
        <h4>⏰ Peak Engagement Hours</h4>
        <div className="engagement-hours">
          <div className="hours-grid">
            {Array.from({ length: 24 }, (_, hour) => {
              const isPeak = audienceInsights.behaviorPatterns.peakEngagementHours.includes(hour);
              return (
                <div 
                  key={hour}
                  className={`hour-item ${isPeak ? 'peak-hour' : ''}`}
                >
                  <div className="hour-label">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  <div className="hour-indicator">
                    {isPeak ? '🔥' : '⚪'}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hours-legend">
            <div className="legend-item">
              <span className="legend-icon">🔥</span>
              <span className="legend-text">Peak Hours</span>
            </div>
            <div className="legend-item">
              <span className="legend-icon">⚪</span>
              <span className="legend-text">Regular Hours</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preferred Content Types */}
      <div className="behavior-section">
        <h4>📱 Preferred Content Types</h4>
        <div className="content-preferences">
          {audienceInsights.behaviorPatterns.preferredContentTypes.map((contentType) => (
            <div key={contentType.type} className="content-preference-item">
              <div className="content-type-icon">
                {contentType.type === ContentType.POST && '📄'}
                {contentType.type === ContentType.STORY && '📖'}
                {contentType.type === ContentType.REEL && '🎬'}
                {contentType.type === ContentType.VIDEO && '📹'}
                {contentType.type === ContentType.CAROUSEL && '🎠'}
                {contentType.type === ContentType.LIVE && '🔴'}
              </div>
              <div className="content-type-info">
                <div className="content-type-name">{contentType.type}</div>
                <div className="content-type-preference">
                  {formatPercentage(contentType.preference * 100)} preference
                </div>
              </div>
              <div className="content-type-bar">
                <div 
                  className="content-type-bar-fill"
                  style={{ 
                    width: `${contentType.preference * 100}%`,
                    backgroundColor: getDemographicColor(contentType.preference * 100)
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="behavior-section">
        <h4>📊 Engagement Metrics</h4>
        <div className="engagement-metrics">
          <div className="metric-card">
            <div className="metric-icon">⏱️</div>
            <div className="metric-info">
              <div className="metric-label">Avg Session Duration</div>
              <div className="metric-value">
                {Math.floor(audienceInsights.behaviorPatterns.averageSessionDuration / 60)}m {Math.floor(audienceInsights.behaviorPatterns.averageSessionDuration % 60)}s
              </div>
            </div>
          </div>
          
          <div className="metric-card">
            <div className="metric-icon">🔄</div>
            <div className="metric-info">
              <div className="metric-label">Content Consumption Rate</div>
              <div className="metric-value">
                {audienceInsights.behaviorPatterns.contentConsumptionRate.toFixed(1)} items/session
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /**
   * Render interests tab
   */
  const renderInterests = () => (
    <div className="interests-content">
      <div className="interests-section">
        <h4>🎯 Audience Interests</h4>
        <div className="interests-grid">
          {audienceInsights.interests.map((interest, index) => (
            <div key={interest.topic} className="interest-item">
              <div className="interest-rank">#{index + 1}</div>
              <div className="interest-info">
                <div className="interest-topic">{interest.topic}</div>
                <div className="interest-metrics">
                  <div className="interest-metric">
                    <span className="metric-label">Relevance:</span>
                    <span className="metric-value">{formatPercentage(interest.relevance * 100)}</span>
                  </div>
                  <div className="interest-metric">
                    <span className="metric-label">Engagement:</span>
                    <span className="metric-value">{formatPercentage(interest.engagementLevel * 100)}</span>
                  </div>
                </div>
              </div>
              <div className="interest-visual">
                <div className="relevance-bar">
                  <div 
                    className="relevance-fill"
                    style={{ 
                      width: `${interest.relevance * 100}%`,
                      backgroundColor: '#3b82f6'
                    }}
                  />
                </div>
                <div className="engagement-bar">
                  <div 
                    className="engagement-fill"
                    style={{ 
                      width: `${interest.engagementLevel * 100}%`,
                      backgroundColor: '#10b981'
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`audience-insights-panel ${className}`}>
      {/* Panel Header */}
      <div className="insights-header">
        <div className="header-content">
          <h3>👥 Audience Insights</h3>
          <p>Understand your audience demographics, behavior, and interests</p>
        </div>
        
        <div className="insights-meta">
          <div className="time-range">
            📅 {new Date(audienceInsights.timeRange.start).toLocaleDateString()} - {new Date(audienceInsights.timeRange.end).toLocaleDateString()}
          </div>
          {audienceInsights.platform && (
            <div className="platform-filter">
              📱 {audienceInsights.platform}
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="insights-tabs">
        <button
          className={`insights-tab ${activeTab === 'demographics' ? 'active' : ''}`}
          onClick={() => setActiveTab('demographics')}
        >
          👥 Demographics
        </button>
        <button
          className={`insights-tab ${activeTab === 'behavior' ? 'active' : ''}`}
          onClick={() => setActiveTab('behavior')}
        >
          📊 Behavior
        </button>
        <button
          className={`insights-tab ${activeTab === 'interests' ? 'active' : ''}`}
          onClick={() => setActiveTab('interests')}
        >
          🎯 Interests
        </button>
      </div>

      {/* Tab Content */}
      <div className="insights-content">
        {activeTab === 'demographics' && renderDemographics()}
        {activeTab === 'behavior' && renderBehavior()}
        {activeTab === 'interests' && renderInterests()}
      </div>

      {/* Insights Summary */}
      <div className="insights-summary">
        <h4>💡 Key Insights</h4>
        <div className="insights-list">
          {/* Top age group */}
          {(() => {
            const topAgeGroup = Object.entries(audienceInsights.demographics.ageGroups)
              .sort(([,a], [,b]) => b.percentage - a.percentage)[0];
            return (
              <div className="insight-item">
                <span className="insight-icon">👥</span>
                <span className="insight-text">
                  Primary audience: {topAgeGroup[0]} ({formatPercentage(topAgeGroup[1].percentage)})
                </span>
              </div>
            );
          })()}
          
          {/* Peak engagement time */}
          <div className="insight-item">
            <span className="insight-icon">⏰</span>
            <span className="insight-text">
              Peak engagement: {audienceInsights.behaviorPatterns.peakEngagementHours.length} hours daily
            </span>
          </div>
          
          {/* Top interest */}
          {audienceInsights.interests.length > 0 && (
            <div className="insight-item">
              <span className="insight-icon">🎯</span>
              <span className="insight-text">
                Top interest: {audienceInsights.interests[0].topic} ({formatPercentage(audienceInsights.interests[0].relevance * 100)} relevance)
              </span>
            </div>
          )}
          
          {/* Top location */}
          {audienceInsights.demographics.topLocations.length > 0 && (
            <div className="insight-item">
              <span className="insight-icon">🌍</span>
              <span className="insight-text">
                Top location: {audienceInsights.demographics.topLocations[0].location} ({formatPercentage(audienceInsights.demographics.topLocations[0].percentage)})
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudienceInsightsPanel;