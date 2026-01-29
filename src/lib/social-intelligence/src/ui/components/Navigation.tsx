/**
 * Navigation Component
 * Main navigation for social intelligence dashboard
 * Requirements: 12.1, 12.2
 */

import React, { useState } from 'react';

export interface NavigationProps {
  /** Currently active tab */
  activeTab: string;
  /** Callback when tab changes */
  onTabChange: (tab: string) => void;
  /** Optional CSS class name */
  className?: string;
}

export interface NavigationTab {
  id: string;
  label: string;
  icon: string;
  description: string;
  badge?: string | number;
}

/**
 * Navigation Component
 * Provides main dashboard navigation
 */
export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  className = ''
}) => {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  /**
   * Define navigation tabs
   */
  const navigationTabs: NavigationTab[] = [
    {
      id: 'copywriter-ai',
      label: 'Copywriter AI',
      icon: '🤖',
      description: 'AI-powered content generation and weekly planning'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: '📊',
      description: 'Performance metrics and audience insights'
    },
    {
      id: 'content-creation',
      label: 'Content Creation',
      icon: '🎨',
      description: 'Upload, manage, and organize content assets'
    },
    {
      id: 'publish',
      label: 'Publish',
      icon: '📅',
      description: 'Schedule and manage content publishing'
    }
  ];

  /**
   * Handle tab click
   */
  const handleTabClick = (tabId: string) => {
    if (tabId !== activeTab) {
      onTabChange(tabId);
    }
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (event: React.KeyboardEvent, tabId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleTabClick(tabId);
    }
  };

  return (
    <nav className={`social-navigation ${className}`} role="navigation" aria-label="Social Media Dashboard Navigation">
      {/* Navigation Header */}
      <div className="social-navigation__header">
        <h2 className="social-navigation__title">
          📱 Social Media Intelligence
        </h2>
        <p className="social-navigation__subtitle">
          Manage your brand's social presence with AI-powered insights
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="social-navigation__tabs" role="tablist">
        {navigationTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isHovered = hoveredTab === tab.id;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              className={`
                social-navigation__tab
                ${isActive ? 'social-navigation__tab--active' : ''}
                ${isHovered ? 'social-navigation__tab--hovered' : ''}
              `}
              onClick={() => handleTabClick(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, tab.id)}
              onMouseEnter={() => setHoveredTab(tab.id)}
              onMouseLeave={() => setHoveredTab(null)}
              title={tab.description}
            >
              <div className="social-navigation__tab-content">
                <span className="social-navigation__tab-icon">
                  {tab.icon}
                </span>
                <span className="social-navigation__tab-label">
                  {tab.label}
                </span>
                {tab.badge && (
                  <span className="social-navigation__tab-badge">
                    {tab.badge}
                  </span>
                )}
              </div>
              
              {/* Tab Description (shown on hover) */}
              {isHovered && (
                <div className="social-navigation__tab-tooltip">
                  {tab.description}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab Indicator */}
      <div className="social-navigation__indicator">
        <div 
          className="social-navigation__indicator-line"
          style={{
            transform: `translateX(${navigationTabs.findIndex(tab => tab.id === activeTab) * 100}%)`
          }}
        />
      </div>

      {/* Breadcrumb Navigation */}
      <div className="social-navigation__breadcrumb">
        <span className="breadcrumb-item">Social Media</span>
        <span className="breadcrumb-separator">›</span>
        <span className="breadcrumb-item breadcrumb-item--active">
          {navigationTabs.find(tab => tab.id === activeTab)?.label || 'Dashboard'}
        </span>
      </div>
    </nav>
  );
};

export default Navigation;