/**
 * Content Plan Editor Component
 * Allows editing and customization of generated content plans
 * Requirements: 7.1, 7.2, 7.5, 7.6, 7.7
 */

import React, { useState } from 'react';
import { ContentPlan, PlatformContent, ContentVariation } from '../../../content/types';
import { Platform } from '../../../types/core';

export interface ContentPlanEditorProps {
  /** Content plan to edit */
  contentPlan: ContentPlan;
  /** Callback when plan is saved */
  onSave: (updatedPlan: ContentPlan) => void;
  /** Callback when editing is cancelled */
  onCancel: () => void;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Content Plan Editor Component
 * Provides editing interface for content plans
 */
export const ContentPlanEditor: React.FC<ContentPlanEditorProps> = ({
  contentPlan,
  onSave,
  onCancel,
  className = ''
}) => {
  const [editedPlan, setEditedPlan] = useState<ContentPlan>({ ...contentPlan });
  const [editingContent, setEditingContent] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  /**
   * Update content piece
   */
  const updateContent = (index: number, updates: Partial<PlatformContent>) => {
    const updatedPlatformContent = [...editedPlan.platformContent];
    updatedPlatformContent[index] = {
      ...updatedPlatformContent[index],
      ...updates
    };

    setEditedPlan(prev => ({
      ...prev,
      platformContent: updatedPlatformContent
    }));
    setHasChanges(true);
  };

  /**
   * Update content text
   */
  const updateContentText = (index: number, text: string) => {
    updateContent(index, {
      content: {
        ...editedPlan.platformContent[index].content,
        text
      }
    });
  };

  /**
   * Update content hashtags
   */
  const updateContentHashtags = (index: number, hashtagsString: string) => {
    const hashtags = hashtagsString
      .split(' ')
      .filter(tag => tag.trim() !== '')
      .map(tag => tag.startsWith('#') ? tag : `#${tag}`);

    updateContent(index, {
      content: {
        ...editedPlan.platformContent[index].content,
        hashtags
      }
    });
  };

  /**
   * Update call to action
   */
  const updateCallToAction = (index: number, callToAction: string) => {
    updateContent(index, {
      content: {
        ...editedPlan.platformContent[index].content,
        callToAction: callToAction || undefined
      }
    });
  };

  /**
   * Update optimal posting time
   */
  const updateOptimalPostingTime = (index: number, dateTime: string) => {
    updateContent(index, {
      optimalPostingTime: new Date(dateTime).toISOString()
    });
  };

  /**
   * Remove content piece
   */
  const removeContent = (index: number) => {
    if (confirm('Are you sure you want to remove this content piece?')) {
      const updatedPlatformContent = editedPlan.platformContent.filter((_, i) => i !== index);
      setEditedPlan(prev => ({
        ...prev,
        platformContent: updatedPlatformContent
      }));
      setHasChanges(true);
      setEditingContent(null);
    }
  };

  /**
   * Update content variation
   */
  const updateVariation = (contentIndex: number, variationIndex: number, updates: Partial<ContentVariation>) => {
    const updatedPlatformContent = [...editedPlan.platformContent];
    const updatedVariations = [...updatedPlatformContent[contentIndex].variations];
    updatedVariations[variationIndex] = {
      ...updatedVariations[variationIndex],
      ...updates
    };
    updatedPlatformContent[contentIndex] = {
      ...updatedPlatformContent[contentIndex],
      variations: updatedVariations
    };

    setEditedPlan(prev => ({
      ...prev,
      platformContent: updatedPlatformContent
    }));
    setHasChanges(true);
  };

  /**
   * Handle save
   */
  const handleSave = () => {
    // Recalculate metrics
    const totalEstimatedReach = editedPlan.platformContent.reduce(
      (sum, content) => sum + content.estimatedReach, 
      0
    );
    const averageEstimatedEngagement = editedPlan.platformContent.length > 0
      ? editedPlan.platformContent.reduce((sum, content) => sum + content.estimatedEngagement, 0) / editedPlan.platformContent.length
      : 0;

    const finalPlan: ContentPlan = {
      ...editedPlan,
      totalEstimatedReach,
      averageEstimatedEngagement
    };

    onSave(finalPlan);
  };

  /**
   * Handle cancel with confirmation if there are changes
   */
  const handleCancel = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        onCancel();
      }
    } else {
      onCancel();
    }
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
   * Format datetime for input
   */
  const formatDateTimeForInput = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
  };

  return (
    <div className={`content-plan-editor ${className}`}>
      {/* Header */}
      <div className="content-plan-editor__header">
        <div className="header-info">
          <h2 className="editor-title">
            ✏️ Edit Content Plan
          </h2>
          <p className="editor-subtitle">
            Customize your AI-generated content plan
          </p>
        </div>

        <div className="header-actions">
          <button onClick={handleCancel} className="btn btn--ghost">
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="btn btn--primary"
            disabled={!hasChanges}
          >
            💾 Save Changes
          </button>
        </div>
      </div>

      {/* Changes Indicator */}
      {hasChanges && (
        <div className="changes-indicator">
          ⚠️ You have unsaved changes
        </div>
      )}

      {/* Content List */}
      <div className="content-plan-editor__content">
        <div className="content-list">
          {editedPlan.platformContent.map((content, index) => (
            <div key={index} className="content-editor-card">
              <div className="content-editor-header">
                <div className="content-platform-info">
                  <span className="platform-icon">{getPlatformIcon(content.platform)}</span>
                  <span className="platform-name">{content.platform}</span>
                  <span className="content-format">{content.format}</span>
                </div>
                
                <div className="content-actions">
                  <button
                    onClick={() => setEditingContent(editingContent === index ? null : index)}
                    className="btn btn--ghost btn--small"
                  >
                    {editingContent === index ? '▲ Collapse' : '▼ Edit'}
                  </button>
                  <button
                    onClick={() => removeContent(index)}
                    className="btn btn--ghost btn--small btn--danger"
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>

              {/* Content Preview */}
              <div className="content-preview">
                <div className="content-text-preview">
                  {content.content.text}
                </div>
                {content.content.hashtags.length > 0 && (
                  <div className="content-hashtags-preview">
                    {content.content.hashtags.join(' ')}
                  </div>
                )}
              </div>

              {/* Editing Form */}
              {editingContent === index && (
                <div className="content-editing-form">
                  {/* Content Text */}
                  <div className="form-group">
                    <label htmlFor={`content-text-${index}`}>Content Text</label>
                    <textarea
                      id={`content-text-${index}`}
                      value={content.content.text}
                      onChange={(e) => updateContentText(index, e.target.value)}
                      className="content-textarea"
                      rows={4}
                      placeholder="Enter your content text..."
                    />
                    <div className="character-count">
                      {content.content.text.length} characters
                    </div>
                  </div>

                  {/* Hashtags */}
                  <div className="form-group">
                    <label htmlFor={`content-hashtags-${index}`}>Hashtags</label>
                    <input
                      id={`content-hashtags-${index}`}
                      type="text"
                      value={content.content.hashtags.join(' ')}
                      onChange={(e) => updateContentHashtags(index, e.target.value)}
                      className="hashtags-input"
                      placeholder="#hashtag1 #hashtag2 #hashtag3"
                    />
                    <div className="hashtag-count">
                      {content.content.hashtags.length} hashtags
                    </div>
                  </div>

                  {/* Call to Action */}
                  <div className="form-group">
                    <label htmlFor={`content-cta-${index}`}>Call to Action (Optional)</label>
                    <input
                      id={`content-cta-${index}`}
                      type="text"
                      value={content.content.callToAction || ''}
                      onChange={(e) => updateCallToAction(index, e.target.value)}
                      className="cta-input"
                      placeholder="e.g., Shop now, Learn more, Sign up..."
                    />
                  </div>

                  {/* Optimal Posting Time */}
                  <div className="form-group">
                    <label htmlFor={`content-timing-${index}`}>Optimal Posting Time</label>
                    <input
                      id={`content-timing-${index}`}
                      type="datetime-local"
                      value={formatDateTimeForInput(content.optimalPostingTime)}
                      onChange={(e) => updateOptimalPostingTime(index, e.target.value)}
                      className="timing-input"
                    />
                  </div>

                  {/* Performance Metrics (Read-only) */}
                  <div className="form-group">
                    <label>Performance Estimates</label>
                    <div className="performance-metrics">
                      <div className="metric">
                        <span className="metric-label">Estimated Reach:</span>
                        <span className="metric-value">{content.estimatedReach.toLocaleString()}</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Estimated Engagement:</span>
                        <span className="metric-value">{Math.round(content.estimatedEngagement * 100)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Content Variations */}
                  {content.variations.length > 0 && (
                    <div className="form-group">
                      <label>Content Variations</label>
                      <div className="variations-editor">
                        {content.variations.map((variation, varIndex) => (
                          <div key={variation.id} className="variation-editor">
                            <div className="variation-header">
                              <span className="variation-label">Variation {varIndex + 1}</span>
                              <span className="variation-tone">{variation.tone}</span>
                            </div>
                            <textarea
                              value={variation.text}
                              onChange={(e) => updateVariation(index, varIndex, { text: e.target.value })}
                              className="variation-textarea"
                              rows={3}
                            />
                            <div className="variation-performance">
                              Expected: {Math.round(variation.estimatedPerformance * 100)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Media Requirements (Read-only) */}
                  {content.content.mediaRequirements && (
                    <div className="form-group">
                      <label>Media Requirements</label>
                      <div className="media-requirements">
                        <div className="requirement">
                          <span className="requirement-label">Type:</span>
                          <span className="requirement-value">{content.content.mediaRequirements.type}</span>
                        </div>
                        <div className="requirement">
                          <span className="requirement-label">Aspect Ratio:</span>
                          <span className="requirement-value">{content.content.mediaRequirements.aspectRatio}</span>
                        </div>
                        {content.content.mediaRequirements.duration && (
                          <div className="requirement">
                            <span className="requirement-label">Duration:</span>
                            <span className="requirement-value">{content.content.mediaRequirements.duration}s</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Plan Summary */}
        <div className="plan-summary">
          <h3>📊 Plan Summary</h3>
          <div className="summary-metrics">
            <div className="summary-metric">
              <span className="summary-label">Total Content Pieces:</span>
              <span className="summary-value">{editedPlan.platformContent.length}</span>
            </div>
            <div className="summary-metric">
              <span className="summary-label">Estimated Total Reach:</span>
              <span className="summary-value">
                {editedPlan.platformContent.reduce((sum, content) => sum + content.estimatedReach, 0).toLocaleString()}
              </span>
            </div>
            <div className="summary-metric">
              <span className="summary-label">Average Engagement:</span>
              <span className="summary-value">
                {Math.round(
                  editedPlan.platformContent.reduce((sum, content) => sum + content.estimatedEngagement, 0) / 
                  editedPlan.platformContent.length * 100
                )}%
              </span>
            </div>
          </div>
        </div>

        {/* Save Actions */}
        <div className="editor-actions">
          <button onClick={handleCancel} className="btn btn--ghost btn--large">
            Cancel Changes
          </button>
          <button 
            onClick={handleSave} 
            className="btn btn--primary btn--large"
            disabled={!hasChanges}
          >
            💾 Save Content Plan
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentPlanEditor;