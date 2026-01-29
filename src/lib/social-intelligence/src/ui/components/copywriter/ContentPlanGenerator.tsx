/**
 * Content Plan Generator Component
 * Interface for configuring and generating AI content plans
 * Requirements: 7.1, 7.2, 7.5, 7.6, 7.7
 */

import React, { useState } from 'react';
import { ContentPlan, ContentGenerationRequest, GenerationStrategy, ContentFormat } from '../../../content/types';
import { Platform } from '../../../types/core';

export interface ContentPlanGeneratorProps {
  /** Brand ID for content generation */
  brandId: string;
  /** Callback when generation is requested */
  onGenerate: (request: ContentGenerationRequest) => void;
  /** Previous generation history */
  generationHistory: ContentPlan[];
  /** Callback to load previous plan */
  onLoadPrevious: (plan: ContentPlan) => void;
  /** Loading state */
  loading: boolean;
  /** Optional CSS class name */
  className?: string;
}

export interface GeneratorFormData {
  strategy: GenerationStrategy;
  platforms: Platform[];
  contentTypes: ContentFormat[];
  weekStarting: string;
  includeTrending: boolean;
  includeUGCBriefs: boolean;
  customPrompts: string[];
}

/**
 * Content Plan Generator Component
 * Provides form interface for configuring content generation
 */
export const ContentPlanGenerator: React.FC<ContentPlanGeneratorProps> = ({
  brandId,
  onGenerate,
  generationHistory,
  onLoadPrevious,
  loading,
  className = ''
}) => {
  // Form state
  const [formData, setFormData] = useState<GeneratorFormData>({
    strategy: GenerationStrategy.TRENDING_TOPICS,
    platforms: [Platform.INSTAGRAM, Platform.TIKTOK],
    contentTypes: [ContentFormat.POST, ContentFormat.STORY, ContentFormat.REEL],
    weekStarting: getNextMonday(),
    includeTrending: true,
    includeUGCBriefs: true,
    customPrompts: ['']
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  /**
   * Get next Monday's date as ISO string
   */
  function getNextMonday(): string {
    const today = new Date();
    const nextMonday = new Date(today);
    const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    return nextMonday.toISOString().split('T')[0];
  }

  /**
   * Handle form field changes
   */
  const handleFieldChange = (field: keyof GeneratorFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Handle platform selection
   */
  const handlePlatformToggle = (platform: Platform) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  /**
   * Handle content type selection
   */
  const handleContentTypeToggle = (contentType: ContentFormat) => {
    setFormData(prev => ({
      ...prev,
      contentTypes: prev.contentTypes.includes(contentType)
        ? prev.contentTypes.filter(ct => ct !== contentType)
        : [...prev.contentTypes, contentType]
    }));
  };

  /**
   * Handle custom prompt changes
   */
  const handleCustomPromptChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      customPrompts: prev.customPrompts.map((prompt, i) => 
        i === index ? value : prompt
      )
    }));
  };

  /**
   * Add new custom prompt
   */
  const addCustomPrompt = () => {
    setFormData(prev => ({
      ...prev,
      customPrompts: [...prev.customPrompts, '']
    }));
  };

  /**
   * Remove custom prompt
   */
  const removeCustomPrompt = (index: number) => {
    setFormData(prev => ({
      ...prev,
      customPrompts: prev.customPrompts.filter((_, i) => i !== index)
    }));
  };

  /**
   * Handle form submission
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.platforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }
    
    if (formData.contentTypes.length === 0) {
      alert('Please select at least one content type');
      return;
    }

    const request: ContentGenerationRequest = {
      brandId,
      strategy: formData.strategy,
      platforms: formData.platforms,
      contentTypes: formData.contentTypes,
      weekStarting: new Date(formData.weekStarting),
      includeTrending: formData.includeTrending,
      includeUGCBriefs: formData.includeUGCBriefs,
      customPrompts: formData.customPrompts.filter(prompt => prompt.trim() !== '')
    };

    onGenerate(request);
  };

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
   * Get content format icon
   */
  const getContentFormatIcon = (format: ContentFormat): string => {
    switch (format) {
      case ContentFormat.POST: return '📄';
      case ContentFormat.STORY: return '📖';
      case ContentFormat.REEL: return '🎬';
      case ContentFormat.CAROUSEL: return '🎠';
      case ContentFormat.VIDEO: return '🎥';
      default: return '📝';
    }
  };

  return (
    <div className={`content-plan-generator ${className}`}>
      {/* Generation Form */}
      <form onSubmit={handleSubmit} className="generator-form">
        {/* Strategy Selection */}
        <div className="form-section">
          <h3 className="section-title">📋 Content Strategy</h3>
          <div className="strategy-grid">
            {Object.values(GenerationStrategy).map(strategy => (
              <label key={strategy} className="strategy-option">
                <input
                  type="radio"
                  name="strategy"
                  value={strategy}
                  checked={formData.strategy === strategy}
                  onChange={(e) => handleFieldChange('strategy', e.target.value as GenerationStrategy)}
                />
                <div className="strategy-card">
                  <div className="strategy-name">
                    {strategy.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                  <div className="strategy-description">
                    {getStrategyDescription(strategy)}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Week Selection */}
        <div className="form-section">
          <h3 className="section-title">📅 Planning Week</h3>
          <div className="week-selector">
            <label htmlFor="week-starting">Week Starting:</label>
            <input
              id="week-starting"
              type="date"
              value={formData.weekStarting}
              onChange={(e) => handleFieldChange('weekStarting', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="date-input"
            />
          </div>
        </div>

        {/* Platform Selection */}
        <div className="form-section">
          <h3 className="section-title">📱 Target Platforms</h3>
          <div className="platform-grid">
            {Object.values(Platform).map(platform => (
              <label key={platform} className="platform-option">
                <input
                  type="checkbox"
                  checked={formData.platforms.includes(platform)}
                  onChange={() => handlePlatformToggle(platform)}
                />
                <div className="platform-card">
                  <span className="platform-icon">{getPlatformIcon(platform)}</span>
                  <span className="platform-name">
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Content Types */}
        <div className="form-section">
          <h3 className="section-title">🎨 Content Types</h3>
          <div className="content-type-grid">
            {Object.values(ContentFormat).map(format => (
              <label key={format} className="content-type-option">
                <input
                  type="checkbox"
                  checked={formData.contentTypes.includes(format)}
                  onChange={() => handleContentTypeToggle(format)}
                />
                <div className="content-type-card">
                  <span className="content-type-icon">{getContentFormatIcon(format)}</span>
                  <span className="content-type-name">
                    {format.charAt(0).toUpperCase() + format.slice(1)}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="form-section">
          <h3 className="section-title">⚙️ Generation Options</h3>
          <div className="options-grid">
            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={formData.includeTrending}
                onChange={(e) => handleFieldChange('includeTrending', e.target.checked)}
              />
              <div className="option-content">
                <span className="option-title">🔥 Include Trending Topics</span>
                <span className="option-description">
                  Incorporate current trending topics and hashtags
                </span>
              </div>
            </label>

            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={formData.includeUGCBriefs}
                onChange={(e) => handleFieldChange('includeUGCBriefs', e.target.checked)}
              />
              <div className="option-content">
                <span className="option-title">👥 Generate UGC Briefs</span>
                <span className="option-description">
                  Create user-generated content campaign briefs
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="form-section">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="advanced-toggle"
          >
            {showAdvanced ? '▼' : '▶'} Advanced Options
          </button>

          {showAdvanced && (
            <div className="advanced-options">
              <h4>Custom Prompts</h4>
              <p className="advanced-description">
                Add specific instructions or themes for content generation
              </p>
              
              {formData.customPrompts.map((prompt, index) => (
                <div key={index} className="custom-prompt-row">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => handleCustomPromptChange(index, e.target.value)}
                    placeholder="e.g., Focus on sustainability themes, Include product benefits..."
                    className="custom-prompt-input"
                  />
                  {formData.customPrompts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCustomPrompt(index)}
                      className="remove-prompt-btn"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              
              <button
                type="button"
                onClick={addCustomPrompt}
                className="add-prompt-btn"
              >
                + Add Custom Prompt
              </button>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <div className="form-actions">
          <button
            type="submit"
            disabled={loading || formData.platforms.length === 0 || formData.contentTypes.length === 0}
            className="btn btn--primary btn--large generate-btn"
          >
            {loading ? (
              <>
                <span className="btn-spinner">⏳</span>
                Generating Content Plan...
              </>
            ) : (
              <>
                ✨ Generate AI Content Plan
              </>
            )}
          </button>
        </div>
      </form>

      {/* Generation History */}
      {generationHistory.length > 0 && (
        <div className="generation-history">
          <h3 className="history-title">📚 Recent Content Plans</h3>
          <div className="history-list">
            {generationHistory.slice(0, 5).map((plan) => (
              <div key={plan.id} className="history-item">
                <div className="history-item-content">
                  <div className="history-item-header">
                    <span className="history-item-date">
                      Week of {new Date(plan.weekStarting).toLocaleDateString()}
                    </span>
                    <span className={`history-item-status status--${plan.complianceStatus.replace('_', '-')}`}>
                      {plan.complianceStatus.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="history-item-details">
                    <span className="history-detail">
                      {plan.platformContent.length} pieces
                    </span>
                    <span className="history-detail">
                      {plan.strategy.replace('_', ' ')}
                    </span>
                    <span className="history-detail">
                      {Math.round(plan.averageEstimatedEngagement * 100)}% engagement
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onLoadPrevious(plan)}
                  className="btn btn--ghost btn--small"
                >
                  Load Plan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Get description for generation strategy
 */
function getStrategyDescription(strategy: GenerationStrategy): string {
  switch (strategy) {
    case GenerationStrategy.TRENDING_TOPICS:
      return 'Focus on current trending topics and viral content';
    case GenerationStrategy.BRAND_FOCUSED:
      return 'Emphasize brand values, mission, and core messaging';
    case GenerationStrategy.UGC_INSPIRED:
      return 'Create content that encourages user-generated content';
    case GenerationStrategy.SEASONAL:
      return 'Align content with seasonal events and holidays';
    case GenerationStrategy.PRODUCT_HIGHLIGHT:
      return 'Showcase specific products and their benefits';
    default:
      return 'AI-powered content generation strategy';
  }
}

export default ContentPlanGenerator;