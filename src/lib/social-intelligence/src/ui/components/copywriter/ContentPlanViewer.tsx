/**
 * Content Plan Viewer Component
 * Displays generated content plans with approval workflow
 * Requirements: 7.1, 7.2, 7.5, 7.6, 7.7
 */

import React, { useState } from 'react';
import { ContentPlan, PlatformContent, TrendingTopic, UGCBrief, ContentVariation } from '../../../content/types';
import { Platform } from '../../../types/core';

export interface ContentPlanViewerProps {
  /** Content plan to display */
  contentPlan: ContentPlan;
  /** Callback when edit is requested */
  onEdit: () => void;
  /** Callback when plan is approved */
  onApprove: () => void;
  /** Callback to generate new plan */
  onGenerateNew: () => void;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Content Plan Viewer Component
 * Displays comprehensive content plan with interactive elements
 */
export const ContentPlanViewer: React.FC<ContentPlanViewerProps> = ({
  contentPlan,
  onEdit,
  onApprove,
  onGenerateNew,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'trending' | 'ugc'>('overview');
  const [selectedContent, setSelectedContent] = useState<PlatformContent | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);

  /**
   * Get platform icon
   */
  const getPlatformIcon = (platform: Platform): string => {
    switch (platform) {
      case Platform.INSTAGRAM: return '📷';
      case Platform.TIKTOK: return '🎵';
      case Platform.FACEBOOK: return '👥';
      case Platform.YOUTUBE: return '📺';
      case Platform.REDDIT: return '🤖';
      default: return '📱';
    }
  };

  /**
   * Get compliance status color
   */
  const getComplianceStatusColor = (status: string): string => {
    switch (status) {
      case 'compliant': return 'status--success';
      case 'needs_review': return 'status--warning';
      case 'violations_found': return 'status--error';
      default: return 'status--default';
    }
  };

  /**
   * Format engagement rate as percentage
   */
  const formatEngagementRate = (rate: number): string => {
    return `${Math.round(rate * 100)}%`;
  };

  /**
   * Format large numbers
   */
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className={`content-plan-viewer ${className}`}>
      {/* Header */}
      <div className="content-plan-viewer__header">
        <div className="header-info">
          <h2 className="plan-title">
            📋 Content Plan - Week of {formatDate(contentPlan.weekStarting)}
          </h2>
          <div className="plan-meta">
            <span className="plan-strategy">
              Strategy: {contentPlan.strategy.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
            <span className={`plan-compliance ${getComplianceStatusColor(contentPlan.complianceStatus)}`}>
              {contentPlan.complianceStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
            <span className="plan-generated">
              Generated: {new Date(contentPlan.generatedAt).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="header-actions">
          <button onClick={onEdit} className="btn btn--secondary">
            ✏️ Edit Plan
          </button>
          <button onClick={onGenerateNew} className="btn btn--ghost">
            ✨ Generate New
          </button>
          {!contentPlan.approvedAt && (
            <button onClick={onApprove} className="btn btn--primary">
              ✅ Approve Plan
            </button>
          )}
          {contentPlan.approvedAt && (
            <div className="approval-badge">
              ✅ Approved {new Date(contentPlan.approvedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="content-plan-viewer__metrics">
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-value">{contentPlan.platformContent.length}</div>
            <div className="metric-label">Content Pieces</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{formatNumber(contentPlan.totalEstimatedReach)}</div>
            <div className="metric-label">Estimated Reach</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{formatEngagementRate(contentPlan.averageEstimatedEngagement)}</div>
            <div className="metric-label">Avg. Engagement</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{contentPlan.trendingTopics.length}</div>
            <div className="metric-label">Trending Topics</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{contentPlan.ugcBriefs.length}</div>
            <div className="metric-label">UGC Briefs</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="content-plan-viewer__tabs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`tab-button ${activeTab === 'overview' ? 'tab-button--active' : ''}`}
        >
          📊 Overview
        </button>
        <button
          onClick={() => setActiveTab('content')}
          className={`tab-button ${activeTab === 'content' ? 'tab-button--active' : ''}`}
        >
          📝 Content ({contentPlan.platformContent.length})
        </button>
        {contentPlan.trendingTopics.length > 0 && (
          <button
            onClick={() => setActiveTab('trending')}
            className={`tab-button ${activeTab === 'trending' ? 'tab-button--active' : ''}`}
          >
            🔥 Trending ({contentPlan.trendingTopics.length})
          </button>
        )}
        {contentPlan.ugcBriefs.length > 0 && (
          <button
            onClick={() => setActiveTab('ugc')}
            className={`tab-button ${activeTab === 'ugc' ? 'tab-button--active' : ''}`}
          >
            👥 UGC Briefs ({contentPlan.ugcBriefs.length})
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="content-plan-viewer__content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {/* Platform Breakdown */}
            <div className="overview-section">
              <h3>📱 Platform Breakdown</h3>
              <div className="platform-breakdown">
                {Object.entries(
                  contentPlan.platformContent.reduce((acc, content) => {
                    acc[content.platform] = (acc[content.platform] || 0) + 1;
                    return acc;
                  }, {} as Record<Platform, number>)
                ).map(([platform, count]) => (
                  <div key={platform} className="platform-stat">
                    <span className="platform-icon">{getPlatformIcon(platform as Platform)}</span>
                    <span className="platform-name">{platform}</span>
                    <span className="platform-count">{count} pieces</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Content Format Breakdown */}
            <div className="overview-section">
              <h3>🎨 Content Format Distribution</h3>
              <div className="format-breakdown">
                {Object.entries(
                  contentPlan.platformContent.reduce((acc, content) => {
                    acc[content.format] = (acc[content.format] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([format, count]) => (
                  <div key={format} className="format-stat">
                    <span className="format-name">{format.replace('_', ' ')}</span>
                    <span className="format-count">{count}</span>
                    <div className="format-bar">
                      <div 
                        className="format-bar-fill"
                        style={{ width: `${(count / contentPlan.platformContent.length) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Predictions */}
            <div className="overview-section">
              <h3>📈 Performance Predictions</h3>
              <div className="performance-predictions">
                <div className="prediction-item">
                  <span className="prediction-label">Best Performing Platform:</span>
                  <span className="prediction-value">
                    {contentPlan.platformContent
                      .reduce((best, content) => 
                        content.estimatedEngagement > best.estimatedEngagement ? content : best
                      ).platform}
                  </span>
                </div>
                <div className="prediction-item">
                  <span className="prediction-label">Optimal Posting Day:</span>
                  <span className="prediction-value">
                    {new Date(contentPlan.platformContent[0]?.optimalPostingTime || Date.now())
                      .toLocaleDateString('en-US', { weekday: 'long' })}
                  </span>
                </div>
                <div className="prediction-item">
                  <span className="prediction-label">Expected Engagement Range:</span>
                  <span className="prediction-value">
                    {formatEngagementRate(Math.min(...contentPlan.platformContent.map(c => c.estimatedEngagement)))} - {formatEngagementRate(Math.max(...contentPlan.platformContent.map(c => c.estimatedEngagement)))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="content-tab">
            <div className="content-grid">
              {contentPlan.platformContent.map((content, index) => (
                <div key={index} className="content-card">
                  <div className="content-card-header">
                    <div className="content-platform">
                      <span className="platform-icon">{getPlatformIcon(content.platform)}</span>
                      <span className="platform-name">{content.platform}</span>
                    </div>
                    <div className="content-format">
                      {content.format.replace('_', ' ')}
                    </div>
                  </div>

                  <div className="content-card-body">
                    <div className="content-text">
                      {content.content.text}
                    </div>
                    
                    {content.content.hashtags.length > 0 && (
                      <div className="content-hashtags">
                        {content.content.hashtags.map((hashtag, i) => (
                          <span key={i} className="hashtag">{hashtag}</span>
                        ))}
                      </div>
                    )}

                    {content.content.callToAction && (
                      <div className="content-cta">
                        <strong>CTA:</strong> {content.content.callToAction}
                      </div>
                    )}
                  </div>

                  <div className="content-card-footer">
                    <div className="content-metrics">
                      <span className="metric">
                        📊 {formatEngagementRate(content.estimatedEngagement)} engagement
                      </span>
                      <span className="metric">
                        👁️ {formatNumber(content.estimatedReach)} reach
                      </span>
                    </div>
                    
                    <div className="content-timing">
                      🕐 {new Date(content.optimalPostingTime).toLocaleString()}
                    </div>

                    {content.variations.length > 0 && (
                      <button
                        onClick={() => setSelectedContent(content)}
                        className="btn btn--ghost btn--small"
                      >
                        View Variations ({content.variations.length})
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trending Topics Tab */}
        {activeTab === 'trending' && (
          <div className="trending-tab">
            <div className="trending-topics-grid">
              {contentPlan.trendingTopics.map((topic, index) => (
                <div key={index} className="trending-topic-card">
                  <div className="topic-header">
                    <h4 className="topic-title">🔥 {topic.topic}</h4>
                    <div className="topic-score">
                      {Math.round(topic.relevanceScore * 100)}% relevant
                    </div>
                  </div>
                  
                  <div className="topic-hashtags">
                    {topic.hashtags.map((hashtag, i) => (
                      <span key={i} className="hashtag">{hashtag}</span>
                    ))}
                  </div>
                  
                  <div className="topic-platforms">
                    <span className="topic-label">Trending on:</span>
                    {topic.trendingPlatforms.map((platform, i) => (
                      <span key={i} className="topic-platform">
                        {getPlatformIcon(platform)} {platform}
                      </span>
                    ))}
                  </div>
                  
                  <div className="topic-timing">
                    Peak: {new Date(topic.peakTime).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* UGC Briefs Tab */}
        {activeTab === 'ugc' && (
          <div className="ugc-tab">
            <div className="ugc-briefs-grid">
              {contentPlan.ugcBriefs.map((brief, index) => (
                <div key={index} className="ugc-brief-card">
                  <div className="brief-header">
                    <h4 className="brief-title">👥 {brief.title}</h4>
                    {brief.deadline && (
                      <div className="brief-deadline">
                        📅 Due: {new Date(brief.deadline).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  
                  <div className="brief-description">
                    {brief.description}
                  </div>
                  
                  <div className="brief-guidelines">
                    <h5>Guidelines:</h5>
                    <ul>
                      {brief.guidelines.map((guideline, i) => (
                        <li key={i}>{guideline}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="brief-hashtags">
                    {brief.hashtags.map((hashtag, i) => (
                      <span key={i} className="hashtag">{hashtag}</span>
                    ))}
                  </div>
                  
                  <div className="brief-footer">
                    <div className="brief-audience">
                      🎯 {brief.targetAudience}
                    </div>
                    {brief.incentive && (
                      <div className="brief-incentive">
                        🎁 {brief.incentive}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content Variations Modal */}
      {selectedContent && (
        <div className="content-variations-modal">
          <div className="modal-overlay" onClick={() => setSelectedContent(null)} />
          <div className="modal-content">
            <div className="modal-header">
              <h3>Content Variations</h3>
              <button onClick={() => setSelectedContent(null)} className="modal-close">×</button>
            </div>
            
            <div className="modal-body">
              <div className="original-content">
                <h4>Original Content</h4>
                <div className="content-preview">
                  {selectedContent.content.text}
                </div>
              </div>
              
              <div className="variations-list">
                <h4>A/B Test Variations</h4>
                {selectedContent.variations.map((variation, index) => (
                  <div key={variation.id} className="variation-item">
                    <div className="variation-header">
                      <span className="variation-label">Variation {index + 1}</span>
                      <span className="variation-tone">{variation.tone}</span>
                      <span className="variation-performance">
                        {formatEngagementRate(variation.estimatedPerformance)} expected
                      </span>
                    </div>
                    <div className="variation-content">
                      {variation.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentPlanViewer;