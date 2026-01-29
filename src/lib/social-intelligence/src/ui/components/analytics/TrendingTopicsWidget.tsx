/**
 * Trending Topics Widget Component
 * Display trending topics analysis and sentiment trends
 * Requirements: 8.7
 */

import React, { useState } from 'react';
import { SentimentTrend } from '../../../analytics/types';
import { Platform } from '../../../types/core';

export interface TrendingTopicsWidgetProps {
  /** Sentiment trend data */
  sentimentTrend: SentimentTrend;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Trending Topics Widget Component
 * Displays trending topics and sentiment analysis
 */
export const TrendingTopicsWidget: React.FC<TrendingTopicsWidgetProps> = ({
  sentimentTrend,
  className = ''
}) => {
  // State for active view
  const [activeView, setActiveView] = useState<'trends' | 'sentiment' | 'events'>('trends');

  /**
   * Format sentiment score for display
   */
  const formatSentimentScore = (score: number): string => {
    return score.toFixed(3);
  };

  /**
   * Get sentiment color
   */
  const getSentimentColor = (score: number): string => {
    if (score > 0.1) return '#10b981'; // Positive - Green
    if (score < -0.1) return '#ef4444'; // Negative - Red
    return '#6b7280'; // Neutral - Gray
  };

  /**
   * Get sentiment emoji
   */
  const getSentimentEmoji = (score: number): string => {
    if (score > 0.3) return '😊';
    if (score > 0.1) return '🙂';
    if (score > -0.1) return '😐';
    if (score > -0.3) return '😕';
    return '😞';
  };

  /**
   * Get trend emoji
   */
  const getTrendEmoji = (trend: string): string => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      case 'stable': return '➡️';
      default: return '📊';
    }
  };

  /**
   * Get platform emoji
   */
  const getPlatformEmoji = (platform: Platform): string => {
    switch (platform) {
      case Platform.INSTAGRAM: return '📷';
      case Platform.TIKTOK: return '🎵';
      case Platform.FACEBOOK: return '👥';
      case Platform.YOUTUBE: return '📺';
      case Platform.TWITTER: return '🐦';
      case Platform.LINKEDIN: return '💼';
      default: return '📱';
    }
  };

  /**
   * Group data points by topic
   */
  const getTopicTrends = () => {
    const topicMap = new Map<string, {
      topic: string;
      mentions: number;
      avgSentiment: number;
      platforms: Platform[];
      recentScore: number;
    }>();

    sentimentTrend.dataPoints.forEach(point => {
      point.topics.forEach(topic => {
        if (!topicMap.has(topic)) {
          topicMap.set(topic, {
            topic,
            mentions: 0,
            avgSentiment: 0,
            platforms: [],
            recentScore: 0
          });
        }

        const data = topicMap.get(topic)!;
        data.mentions += point.mentionCount;
        data.avgSentiment = (data.avgSentiment + point.sentimentScore) / 2;
        
        if (!data.platforms.includes(point.platform)) {
          data.platforms.push(point.platform);
        }
        
        // Use most recent sentiment score
        const pointTime = new Date(point.timestamp).getTime();
        const recentTime = new Date(sentimentTrend.dataPoints[sentimentTrend.dataPoints.length - 1].timestamp).getTime();
        if (pointTime >= recentTime - 24 * 60 * 60 * 1000) { // Last 24 hours
          data.recentScore = point.sentimentScore;
        }
      });
    });

    return Array.from(topicMap.values())
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 10);
  };

  /**
   * Render trending topics view
   */
  const renderTrends = () => {
    const topicTrends = getTopicTrends();

    return (
      <div className="trends-content">
        <div className="trends-header">
          <h4>🔥 Trending Topics</h4>
          <p>Most mentioned topics in your brand conversations</p>
        </div>

        <div className="topics-list">
          {topicTrends.map((topic, index) => (
            <div key={topic.topic} className="topic-item">
              <div className="topic-rank">#{index + 1}</div>
              
              <div className="topic-info">
                <div className="topic-name">{topic.topic}</div>
                <div className="topic-stats">
                  <span className="topic-mentions">
                    💬 {topic.mentions} mentions
                  </span>
                  <span className="topic-platforms">
                    {topic.platforms.map(platform => getPlatformEmoji(platform)).join(' ')}
                  </span>
                </div>
              </div>
              
              <div className="topic-sentiment">
                <div className="sentiment-score">
                  <span className="sentiment-emoji">
                    {getSentimentEmoji(topic.avgSentiment)}
                  </span>
                  <span 
                    className="sentiment-value"
                    style={{ color: getSentimentColor(topic.avgSentiment) }}
                  >
                    {formatSentimentScore(topic.avgSentiment)}
                  </span>
                </div>
                
                <div className="sentiment-bar">
                  <div 
                    className="sentiment-fill"
                    style={{ 
                      width: `${Math.abs(topic.avgSentiment) * 100}%`,
                      backgroundColor: getSentimentColor(topic.avgSentiment)
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {topicTrends.length === 0 && (
          <div className="empty-topics">
            <div className="empty-icon">🔍</div>
            <p>No trending topics found for the selected time range</p>
          </div>
        )}
      </div>
    );
  };

  /**
   * Render sentiment analysis view
   */
  const renderSentiment = () => {
    // Calculate sentiment distribution
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    let totalMentions = 0;

    sentimentTrend.dataPoints.forEach(point => {
      totalMentions += point.mentionCount;
      if (point.sentimentScore > 0.1) {
        sentimentCounts.positive += point.mentionCount;
      } else if (point.sentimentScore < -0.1) {
        sentimentCounts.negative += point.mentionCount;
      } else {
        sentimentCounts.neutral += point.mentionCount;
      }
    });

    const sentimentPercentages = {
      positive: totalMentions > 0 ? (sentimentCounts.positive / totalMentions) * 100 : 0,
      neutral: totalMentions > 0 ? (sentimentCounts.neutral / totalMentions) * 100 : 0,
      negative: totalMentions > 0 ? (sentimentCounts.negative / totalMentions) * 100 : 0
    };

    return (
      <div className="sentiment-content">
        <div className="sentiment-header">
          <h4>💭 Sentiment Analysis</h4>
          <p>Overall brand sentiment across all mentions</p>
        </div>

        {/* Sentiment Overview */}
        <div className="sentiment-overview">
          <div className="sentiment-trend-indicator">
            <div className="trend-icon">
              {getTrendEmoji(sentimentTrend.overallTrend)}
            </div>
            <div className="trend-info">
              <div className="trend-label">Overall Trend</div>
              <div className="trend-value">
                {sentimentTrend.overallTrend} 
                <span className="trend-strength">
                  ({(sentimentTrend.trendStrength * 100).toFixed(1)}% strength)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sentiment Distribution */}
        <div className="sentiment-distribution">
          <h5>Sentiment Breakdown</h5>
          
          <div className="sentiment-bars">
            <div className="sentiment-bar-item">
              <div className="sentiment-label">
                <span className="sentiment-emoji">😊</span>
                <span className="sentiment-name">Positive</span>
                <span className="sentiment-percentage">
                  {sentimentPercentages.positive.toFixed(1)}%
                </span>
              </div>
              <div className="sentiment-bar-container">
                <div 
                  className="sentiment-bar-fill"
                  style={{ 
                    width: `${sentimentPercentages.positive}%`,
                    backgroundColor: '#10b981'
                  }}
                />
              </div>
              <div className="sentiment-count">
                {sentimentCounts.positive} mentions
              </div>
            </div>

            <div className="sentiment-bar-item">
              <div className="sentiment-label">
                <span className="sentiment-emoji">😐</span>
                <span className="sentiment-name">Neutral</span>
                <span className="sentiment-percentage">
                  {sentimentPercentages.neutral.toFixed(1)}%
                </span>
              </div>
              <div className="sentiment-bar-container">
                <div 
                  className="sentiment-bar-fill"
                  style={{ 
                    width: `${sentimentPercentages.neutral}%`,
                    backgroundColor: '#6b7280'
                  }}
                />
              </div>
              <div className="sentiment-count">
                {sentimentCounts.neutral} mentions
              </div>
            </div>

            <div className="sentiment-bar-item">
              <div className="sentiment-label">
                <span className="sentiment-emoji">😞</span>
                <span className="sentiment-name">Negative</span>
                <span className="sentiment-percentage">
                  {sentimentPercentages.negative.toFixed(1)}%
                </span>
              </div>
              <div className="sentiment-bar-container">
                <div 
                  className="sentiment-bar-fill"
                  style={{ 
                    width: `${sentimentPercentages.negative}%`,
                    backgroundColor: '#ef4444'
                  }}
                />
              </div>
              <div className="sentiment-count">
                {sentimentCounts.negative} mentions
              </div>
            </div>
          </div>
        </div>

        {/* Recent Sentiment Timeline */}
        <div className="sentiment-timeline">
          <h5>Recent Sentiment Timeline</h5>
          <div className="timeline-container">
            {sentimentTrend.dataPoints.slice(-10).map((point, index) => (
              <div key={index} className="timeline-point">
                <div className="timeline-time">
                  {new Date(point.timestamp).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit'
                  })}
                </div>
                <div className="timeline-sentiment">
                  <span className="timeline-emoji">
                    {getSentimentEmoji(point.sentimentScore)}
                  </span>
                  <span 
                    className="timeline-score"
                    style={{ color: getSentimentColor(point.sentimentScore) }}
                  >
                    {formatSentimentScore(point.sentimentScore)}
                  </span>
                </div>
                <div className="timeline-mentions">
                  {point.mentionCount} mentions
                </div>
                <div className="timeline-platform">
                  {getPlatformEmoji(point.platform)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render significant events view
   */
  const renderEvents = () => (
    <div className="events-content">
      <div className="events-header">
        <h4>⚡ Significant Events</h4>
        <p>Notable events that impacted brand sentiment</p>
      </div>

      <div className="events-list">
        {sentimentTrend.significantEvents.map((event, index) => (
          <div key={index} className="event-item">
            <div className="event-impact">
              <div 
                className="impact-indicator"
                style={{ 
                  backgroundColor: getSentimentColor(event.impact),
                  width: `${Math.abs(event.impact) * 50 + 10}px`,
                  height: `${Math.abs(event.impact) * 50 + 10}px`
                }}
              >
                {getSentimentEmoji(event.impact)}
              </div>
            </div>
            
            <div className="event-info">
              <div className="event-title">{event.event}</div>
              <div className="event-description">{event.description}</div>
              <div className="event-meta">
                <span className="event-time">
                  📅 {new Date(event.timestamp).toLocaleDateString()}
                </span>
                <span 
                  className="event-impact-score"
                  style={{ color: getSentimentColor(event.impact) }}
                >
                  Impact: {formatSentimentScore(event.impact)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {sentimentTrend.significantEvents.length === 0 && (
        <div className="empty-events">
          <div className="empty-icon">📊</div>
          <p>No significant events detected in the selected time range</p>
        </div>
      )}
    </div>
  );

  return (
    <div className={`trending-topics-widget ${className}`}>
      {/* Widget Header */}
      <div className="widget-header">
        <div className="header-content">
          <h3>🔥 Trending Topics & Sentiment</h3>
          <p>Track trending topics and brand sentiment over time</p>
        </div>
        
        <div className="widget-meta">
          <div className="time-range">
            📅 {new Date(sentimentTrend.timeRange.start).toLocaleDateString()} - {new Date(sentimentTrend.timeRange.end).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="widget-tabs">
        <button
          className={`widget-tab ${activeView === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveView('trends')}
        >
          🔥 Trending
        </button>
        <button
          className={`widget-tab ${activeView === 'sentiment' ? 'active' : ''}`}
          onClick={() => setActiveView('sentiment')}
        >
          💭 Sentiment
        </button>
        <button
          className={`widget-tab ${activeView === 'events' ? 'active' : ''}`}
          onClick={() => setActiveView('events')}
        >
          ⚡ Events
        </button>
      </div>

      {/* Tab Content */}
      <div className="widget-content">
        {activeView === 'trends' && renderTrends()}
        {activeView === 'sentiment' && renderSentiment()}
        {activeView === 'events' && renderEvents()}
      </div>

      {/* Widget Summary */}
      <div className="widget-summary">
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="stat-icon">💬</span>
            <span className="stat-label">Total Mentions:</span>
            <span className="stat-value">
              {sentimentTrend.dataPoints.reduce((sum, point) => sum + point.mentionCount, 0)}
            </span>
          </div>
          
          <div className="summary-stat">
            <span className="stat-icon">📊</span>
            <span className="stat-label">Avg Sentiment:</span>
            <span 
              className="stat-value"
              style={{ 
                color: getSentimentColor(
                  sentimentTrend.dataPoints.reduce((sum, point) => sum + point.sentimentScore, 0) / 
                  Math.max(sentimentTrend.dataPoints.length, 1)
                )
              }}
            >
              {formatSentimentScore(
                sentimentTrend.dataPoints.reduce((sum, point) => sum + point.sentimentScore, 0) / 
                Math.max(sentimentTrend.dataPoints.length, 1)
              )}
            </span>
          </div>
          
          <div className="summary-stat">
            <span className="stat-icon">{getTrendEmoji(sentimentTrend.overallTrend)}</span>
            <span className="stat-label">Trend:</span>
            <span className="stat-value">{sentimentTrend.overallTrend}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendingTopicsWidget;