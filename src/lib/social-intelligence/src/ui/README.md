# Social Intelligence UI Components

This directory contains the React UI components for the Social Media Intelligence dashboard, designed to integrate seamlessly with the existing CCC interface.

## Overview

The UI system provides a comprehensive dashboard for managing social media intelligence, including:

- **Social Media Tab**: Main dashboard with four sections (Copywriter AI, Analytics, Content Creation, Publish)
- **Social Events Display**: Real-time social media event monitoring and filtering
- **Navigation**: Tab-based navigation with context preservation
- **Common Components**: Reusable UI elements (loading, errors, pagination)

## Architecture

### Component Hierarchy

```
SocialMediaDashboard (Main Container)
├── Navigation (Tab Navigation)
├── SocialMediaTab (Social Events Sidebar)
│   ├── SocialEventsMetrics (Overview Metrics)
│   ├── SocialEventsFilters (Filtering Controls)
│   └── SocialEventsList (Event Display)
│       └── SocialEventCard (Individual Events)
└── Dashboard Panels (Tab Content Areas)
    ├── Copywriter AI Panel
    ├── Analytics Panel
    ├── Content Creation Panel
    └── Publishing Panel
```

### Key Features

1. **Context Preservation**: User work is preserved when switching between tabs
2. **Real-time Updates**: Social events update automatically with configurable refresh
3. **Responsive Design**: Works on desktop and mobile devices
4. **Accessibility**: Full keyboard navigation and screen reader support
5. **Integration Ready**: Designed to work with existing CCC infrastructure

## Components

### Copywriter AI Components

The Copywriter AI system provides comprehensive AI-powered content generation capabilities:

**Key Features:**
- **Strategy-Based Generation**: Choose from trending topics, brand-focused, UGC-inspired, seasonal, or product highlight strategies
- **Multi-Platform Support**: Generate content optimized for Instagram, TikTok, Facebook, YouTube, and Reddit
- **Content Format Variety**: Create posts, stories, reels, carousels, and videos
- **Trending Topic Integration**: Automatically incorporate relevant trending topics and hashtags
- **A/B Testing Variations**: Generate multiple content variations for testing
- **Performance Optimization**: Suggest optimal posting times and predict engagement
- **Brand Compliance**: Ensure all content aligns with brand guidelines and compliance rules
- **UGC Brief Generation**: Create user-generated content campaign briefs
- **Interactive Editing**: Edit and customize generated content with real-time updates
- **Approval Workflow**: Review and approve content plans before publishing

**Workflow:**
1. **Generate**: Configure strategy, platforms, and content types
2. **Review**: View generated content plan with metrics and predictions
3. **Edit**: Customize content, hashtags, timing, and variations
4. **Approve**: Finalize content plan for scheduling and publishing

### Main Components

### Main Components

#### `SocialMediaDashboard`
The main dashboard container that orchestrates all other components.

```tsx
import { SocialMediaDashboard } from './components/SocialMediaDashboard';

<SocialMediaDashboard
  apiService={apiService}
  initialTab="copywriter-ai"
  onTabChange={(tab) => console.log('Tab changed:', tab)}
/>
```

#### `CopywriterAIInterface`
Complete AI-powered content generation interface with planning, viewing, and editing capabilities.

```tsx
import { CopywriterAIInterface } from './components/copywriter/CopywriterAIInterface';

<CopywriterAIInterface
  contentGenerationService={contentGenerationService}
  brandId="your-brand-id"
  onContentPlanGenerated={(plan) => console.log('Generated:', plan)}
  onContentPlanApproved={(plan) => console.log('Approved:', plan)}
/>
```

#### `ContentPlanGenerator`
Form interface for configuring AI content generation with strategy selection, platform targeting, and advanced options.

```tsx
import { ContentPlanGenerator } from './components/copywriter/ContentPlanGenerator';

<ContentPlanGenerator
  brandId="your-brand-id"
  onGenerate={(request) => generateContent(request)}
  generationHistory={previousPlans}
  onLoadPrevious={(plan) => loadPlan(plan)}
  loading={false}
/>
```

#### `ContentPlanViewer`
Comprehensive viewer for generated content plans with approval workflow and performance metrics.

```tsx
import { ContentPlanViewer } from './components/copywriter/ContentPlanViewer';

<ContentPlanViewer
  contentPlan={generatedPlan}
  onEdit={() => editPlan()}
  onApprove={() => approvePlan()}
  onGenerateNew={() => generateNew()}
/>
```

#### `ContentPlanEditor`
Interactive editor for customizing generated content plans with real-time updates.

```tsx
import { ContentPlanEditor } from './components/copywriter/ContentPlanEditor';

<ContentPlanEditor
  contentPlan={planToEdit}
  onSave={(updatedPlan) => savePlan(updatedPlan)}
  onCancel={() => cancelEditing()}
/>
```

#### `Navigation`
Tab-based navigation with breadcrumbs and context indicators.

```tsx
import { Navigation } from './components/Navigation';

<Navigation
  activeTab="analytics"
  onTabChange={handleTabChange}
/>
```

#### `SocialMediaTab`
Sidebar component for displaying and filtering social media events.

```tsx
import { SocialMediaTab } from './components/SocialMediaTab';

<SocialMediaTab
  apiService={apiService}
  onEventSelect={(event) => console.log('Selected:', event)}
/>
```

### Event Display Components

#### `SocialEventsList`
Paginated list of social media events with filtering and sorting.

#### `SocialEventCard`
Individual event display with engagement metrics and platform information.

#### `SocialEventsFilters`
Comprehensive filtering interface with platform, date, sentiment, and search filters.

#### `SocialEventsMetrics`
Overview metrics dashboard showing key performance indicators.

### Common Components

#### `LoadingSpinner`
Consistent loading state indicator with customizable size and message.

#### `ErrorMessage`
Error display component with dismissible alerts and different severity levels.

#### `Pagination`
Pagination controls with page numbers and navigation buttons.

## Styling

The components use a custom CSS file (`styles/social-intelligence.css`) that:

- Follows CCC design system patterns
- Provides responsive layouts
- Includes dark/light theme support
- Uses CSS custom properties for theming

### CSS Classes

Key CSS classes for customization:

- `.social-media-dashboard`: Main dashboard container
- `.social-navigation`: Navigation component
- `.social-media-tab`: Social events sidebar
- `.dashboard-panel`: Content panel areas
- `.btn`: Button components with variants

## Integration with CCC

### Tab Integration

To integrate with the existing CCC tab system:

```tsx
// In your CCC tab component
import { DashboardExample } from './examples/DashboardExample';

const SocialMediaTab = () => {
  return (
    <div className="ccc-tab-content">
      <DashboardExample />
    </div>
  );
};
```

### API Service Configuration

Configure the API service with your CCC backend:

```tsx
const apiService = new SocialEventsApiService({
  baseUrl: process.env.REACT_APP_CCC_API_URL,
  apiKey: process.env.REACT_APP_CCC_API_KEY,
  // Additional CCC-specific configuration
});
```

### Styling Integration

Include the CSS file in your CCC build process or import it directly:

```tsx
import './src/lib/social-intelligence/src/ui/styles/social-intelligence.css';
```

## Development Status

### Completed (Tasks 16.1 & 16.2)
- ✅ Main dashboard structure and navigation
- ✅ Social events display and filtering
- ✅ Context preservation between tabs
- ✅ Responsive design and accessibility
- ✅ **Copywriter AI Interface** - Complete AI-powered content generation system
- ✅ **Content Plan Generator** - Form interface for configuring AI content generation
- ✅ **Content Plan Viewer** - Display and approval workflow for generated plans
- ✅ **Content Plan Editor** - Edit and customize generated content plans
- ✅ Integration examples and documentation

### Upcoming Tasks
- 🚧 **Task 16.3**: Analytics dashboard
- 🚧 **Task 16.4**: Content creation interface
- 🚧 **Task 16.5**: Publishing and scheduling interface

## Usage Examples

### Basic Dashboard

```tsx
import { SocialMediaDashboard } from '@/lib/social-intelligence/ui';

function App() {
  const apiService = new SocialEventsApiService({
    baseUrl: 'https://api.example.com',
    apiKey: 'your-api-key'
  });

  return (
    <SocialMediaDashboard
      apiService={apiService}
      initialTab="copywriter-ai"
    />
  );
}
```

### Custom Event Handling

```tsx
import { SocialMediaTab } from '@/lib/social-intelligence/ui';

function SocialEventsSidebar() {
  const handleEventSelect = (event) => {
    // Custom event handling
    console.log('Event selected:', event);
    
    // Integrate with CCC systems
    updateCRMRecord(event);
    trackAnalytics(event);
  };

  return (
    <SocialMediaTab
      apiService={apiService}
      onEventSelect={handleEventSelect}
    />
  );
}
```

### Filtering and Search

```tsx
import { SocialEventsFilters } from '@/lib/social-intelligence/ui';

function CustomFilters() {
  const [filters, setFilters] = useState({
    platform: 'tiktok',
    sentiment: 'positive',
    startDate: '2024-01-01'
  });

  return (
    <SocialEventsFilters
      filters={filters}
      onFiltersChange={setFilters}
      onReset={() => setFilters({})}
    />
  );
}
```

## Testing

The components include comprehensive testing:

- Unit tests for individual components
- Integration tests for component interactions
- Property-based tests for UI behavior
- Accessibility tests for keyboard navigation

Run tests with:

```bash
npm test src/lib/social-intelligence/src/ui/
```

## Contributing

When adding new UI components:

1. Follow the existing component structure
2. Include TypeScript interfaces for all props
3. Add comprehensive JSDoc documentation
4. Include accessibility attributes (ARIA labels, roles)
5. Write unit tests for component behavior
6. Update this README with new component documentation

## Browser Support

The components support:

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

For older browser support, additional polyfills may be required.