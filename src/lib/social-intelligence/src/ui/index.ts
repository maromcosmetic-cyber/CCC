/**
 * UI Components Index
 * Exports all UI components for the Social Intelligence system
 * Requirements: 1.1, 1.2, 12.1, 12.2
 */

// Main Dashboard Components
export { SocialMediaDashboard } from './components/SocialMediaDashboard';
export type { SocialMediaDashboardProps, DashboardState } from './components/SocialMediaDashboard';

export { Navigation } from './components/Navigation';
export type { NavigationProps, NavigationTab } from './components/Navigation';

export { SocialMediaTab } from './components/SocialMediaTab';
export type { SocialMediaTabProps, SocialEventsFilters, PaginationState } from './components/SocialMediaTab';

// Copywriter AI Components
export { CopywriterAIInterface } from './components/copywriter/CopywriterAIInterface';
export type { CopywriterAIInterfaceProps, CopywriterAIState } from './components/copywriter/CopywriterAIInterface';

export { ContentPlanGenerator } from './components/copywriter/ContentPlanGenerator';
export type { ContentPlanGeneratorProps, GeneratorFormData } from './components/copywriter/ContentPlanGenerator';

export { ContentPlanViewer } from './components/copywriter/ContentPlanViewer';
export type { ContentPlanViewerProps } from './components/copywriter/ContentPlanViewer';

export { ContentPlanEditor } from './components/copywriter/ContentPlanEditor';
export type { ContentPlanEditorProps } from './components/copywriter/ContentPlanEditor';

// Analytics Components
export { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
export type { AnalyticsDashboardProps, DashboardData } from './components/analytics/AnalyticsDashboard';

export { PerformanceMetricsChart } from './components/analytics/PerformanceMetricsChart';
export type { PerformanceMetricsChartProps, ChartData } from './components/analytics/PerformanceMetricsChart';

export { AudienceInsightsPanel } from './components/analytics/AudienceInsightsPanel';
export type { AudienceInsightsPanelProps } from './components/analytics/AudienceInsightsPanel';

export { TrendingTopicsWidget } from './components/analytics/TrendingTopicsWidget';
export type { TrendingTopicsWidgetProps } from './components/analytics/TrendingTopicsWidget';

export { BenchmarkComparison } from './components/analytics/BenchmarkComparison';
export type { BenchmarkComparisonProps, BenchmarkData } from './components/analytics/BenchmarkComparison';

// Event Display Components
export { SocialEventsList } from './components/SocialEventsList';
export type { SocialEventsListProps } from './components/SocialEventsList';

export { SocialEventCard } from './components/SocialEventCard';
export type { SocialEventCardProps } from './components/SocialEventCard';

// Filter and Control Components
export { SocialEventsFilters } from './components/SocialEventsFilters';
export type { SocialEventsFiltersProps } from './components/SocialEventsFilters';

export { SocialEventsMetrics } from './components/SocialEventsMetrics';
export type { SocialEventsMetricsProps, MetricsData } from './components/SocialEventsMetrics';

// Common UI Components
export { LoadingSpinner } from './components/common/LoadingSpinner';
export type { LoadingSpinnerProps } from './components/common/LoadingSpinner';

export { ErrorMessage } from './components/common/ErrorMessage';
export type { ErrorMessageProps } from './components/common/ErrorMessage';

export { Pagination } from './components/common/Pagination';
export type { PaginationProps } from './components/common/Pagination';

// Re-export core types for convenience
export type { SocialEvent, Platform, EventType } from '../types/core';