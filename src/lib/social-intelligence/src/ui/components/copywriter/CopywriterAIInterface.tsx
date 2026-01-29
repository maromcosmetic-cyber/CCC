/**
 * Copywriter AI Interface Component
 * Main interface for AI-powered content generation and weekly planning
 * Requirements: 7.1, 7.2, 7.5, 7.6, 7.7
 */

import React, { useState, useEffect } from 'react';
import { ContentPlan, ContentGenerationRequest, GenerationStrategy, ContentFormat } from '../../../content/types';
import { Platform } from '../../../types/core';
import { AIContentGenerationService } from '../../../content/AIContentGenerationService';
import { ContentPlanGenerator } from './ContentPlanGenerator';
import { ContentPlanViewer } from './ContentPlanViewer';
import { ContentPlanEditor } from './ContentPlanEditor';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';

export interface CopywriterAIInterfaceProps {
  /** AI content generation service */
  contentGenerationService: AIContentGenerationService;
  /** Brand ID for content generation */
  brandId: string;
  /** Optional CSS class name */
  className?: string;
  /** Callback when content plan is generated */
  onContentPlanGenerated?: (plan: ContentPlan) => void;
  /** Callback when content plan is approved */
  onContentPlanApproved?: (plan: ContentPlan) => void;
}

export interface CopywriterAIState {
  currentView: 'generator' | 'viewer' | 'editor';
  contentPlan: ContentPlan | null;
  loading: boolean;
  error: string | null;
  generationHistory: ContentPlan[];
}

/**
 * Copywriter AI Interface Component
 * Provides comprehensive AI-powered content generation interface
 */
export const CopywriterAIInterface: React.FC<CopywriterAIInterfaceProps> = ({
  contentGenerationService,
  brandId,
  className = '',
  onContentPlanGenerated,
  onContentPlanApproved
}) => {
  // State management
  const [state, setState] = useState<CopywriterAIState>({
    currentView: 'generator',
    contentPlan: null,
    loading: false,
    error: null,
    generationHistory: []
  });

  /**
   * Handle content plan generation
   */
  const handleGenerateContentPlan = async (request: ContentGenerationRequest) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const contentPlan = await contentGenerationService.generateWeeklyContentPlan(request);
      
      setState(prev => ({
        ...prev,
        contentPlan,
        currentView: 'viewer',
        loading: false,
        generationHistory: [contentPlan, ...prev.generationHistory.slice(0, 9)] // Keep last 10
      }));

      onContentPlanGenerated?.(contentPlan);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to generate content plan',
        loading: false
      }));
    }
  };

  /**
   * Handle content plan editing
   */
  const handleEditContentPlan = (plan: ContentPlan) => {
    setState(prev => ({
      ...prev,
      contentPlan: plan,
      currentView: 'editor'
    }));
  };

  /**
   * Handle content plan approval
   */
  const handleApproveContentPlan = (plan: ContentPlan) => {
    const approvedPlan: ContentPlan = {
      ...plan,
      approvedAt: new Date().toISOString(),
      approvedBy: 'current_user' // In real app, get from auth context
    };

    setState(prev => ({
      ...prev,
      contentPlan: approvedPlan,
      currentView: 'viewer'
    }));

    onContentPlanApproved?.(approvedPlan);
  };

  /**
   * Handle view navigation
   */
  const handleViewChange = (view: CopywriterAIState['currentView']) => {
    setState(prev => ({ ...prev, currentView: view }));
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  /**
   * Load previous content plan
   */
  const handleLoadPreviousPlan = (plan: ContentPlan) => {
    setState(prev => ({
      ...prev,
      contentPlan: plan,
      currentView: 'viewer'
    }));
  };

  return (
    <div className={`copywriter-ai-interface ${className}`}>
      {/* Header */}
      <div className="copywriter-ai-interface__header">
        <div className="header-content">
          <h2 className="header-title">
            🤖 Copywriter AI
          </h2>
          <p className="header-subtitle">
            Generate AI-powered weekly content plans with platform-specific optimization
          </p>
        </div>

        {/* Navigation */}
        <div className="header-navigation">
          <button
            onClick={() => handleViewChange('generator')}
            className={`nav-button ${state.currentView === 'generator' ? 'nav-button--active' : ''}`}
          >
            ✨ Generate
          </button>
          
          {state.contentPlan && (
            <>
              <button
                onClick={() => handleViewChange('viewer')}
                className={`nav-button ${state.currentView === 'viewer' ? 'nav-button--active' : ''}`}
              >
                👁️ View Plan
              </button>
              
              <button
                onClick={() => handleViewChange('editor')}
                className={`nav-button ${state.currentView === 'editor' ? 'nav-button--active' : ''}`}
              >
                ✏️ Edit Plan
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="copywriter-ai-interface__error">
          <ErrorMessage
            message={state.error}
            type="error"
            onDismiss={clearError}
          />
        </div>
      )}

      {/* Loading State */}
      {state.loading && (
        <div className="copywriter-ai-interface__loading">
          <LoadingSpinner
            message="Generating AI-powered content plan..."
            size="large"
          />
        </div>
      )}

      {/* Main Content */}
      <div className="copywriter-ai-interface__content">
        {state.currentView === 'generator' && (
          <ContentPlanGenerator
            brandId={brandId}
            onGenerate={handleGenerateContentPlan}
            generationHistory={state.generationHistory}
            onLoadPrevious={handleLoadPreviousPlan}
            loading={state.loading}
            className="copywriter-ai-interface__generator"
          />
        )}

        {state.currentView === 'viewer' && state.contentPlan && (
          <ContentPlanViewer
            contentPlan={state.contentPlan}
            onEdit={() => handleEditContentPlan(state.contentPlan!)}
            onApprove={() => handleApproveContentPlan(state.contentPlan!)}
            onGenerateNew={() => handleViewChange('generator')}
            className="copywriter-ai-interface__viewer"
          />
        )}

        {state.currentView === 'editor' && state.contentPlan && (
          <ContentPlanEditor
            contentPlan={state.contentPlan}
            onSave={(updatedPlan) => {
              setState(prev => ({ ...prev, contentPlan: updatedPlan, currentView: 'viewer' }));
            }}
            onCancel={() => handleViewChange('viewer')}
            className="copywriter-ai-interface__editor"
          />
        )}

        {/* Empty State */}
        {!state.loading && !state.contentPlan && state.currentView !== 'generator' && (
          <div className="copywriter-ai-interface__empty">
            <div className="empty-state">
              <div className="empty-state__icon">🤖</div>
              <h3>No Content Plan Generated</h3>
              <p>Generate your first AI-powered content plan to get started.</p>
              <button
                onClick={() => handleViewChange('generator')}
                className="btn btn--primary"
              >
                Generate Content Plan
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      {state.generationHistory.length > 0 && (
        <div className="copywriter-ai-interface__stats">
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{state.generationHistory.length}</span>
              <span className="stat-label">Plans Generated</span>
            </div>
            
            {state.contentPlan && (
              <>
                <div className="stat-item">
                  <span className="stat-value">{state.contentPlan.platformContent.length}</span>
                  <span className="stat-label">Content Pieces</span>
                </div>
                
                <div className="stat-item">
                  <span className="stat-value">
                    {Math.round(state.contentPlan.averageEstimatedEngagement * 100)}%
                  </span>
                  <span className="stat-label">Avg. Engagement</span>
                </div>
                
                <div className="stat-item">
                  <span className="stat-value">
                    {state.contentPlan.totalEstimatedReach.toLocaleString()}
                  </span>
                  <span className="stat-label">Est. Reach</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CopywriterAIInterface;