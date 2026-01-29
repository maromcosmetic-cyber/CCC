# Brand-Aware Social Intelligence & Action Engine

A comprehensive TypeScript-based social media intelligence and automation system that integrates with the existing CCC infrastructure. The system follows an event-driven microservices architecture to ingest, normalize, analyze, and act upon social media signals across multiple platforms while maintaining strict brand compliance.

## Overview

The Brand-Aware Social Intelligence & Action Engine processes social media data through a multi-stage pipeline:

1. **Ingestion** from platform APIs (TikTok, Meta, YouTube, Reddit, RSS)
2. **Normalization** into unified events
3. **AI-powered analysis** for sentiment and intent detection
4. **Brand-aware decision making** using playbooks and personas
5. **Automated action execution** with compliance validation

## Architecture

### Core Components

- **Types & Schemas**: Zod-validated TypeScript types for all data models
- **Database Layer**: PostgreSQL with Supabase integration
- **Repository Pattern**: Type-safe data access layer
- **Event Processing**: Kafka-based event streaming (planned)
- **AI Intelligence**: Multi-model sentiment and intent analysis (planned)
- **Decision Engine**: Rule-based action determination (planned)

### Data Models

#### SocialEvent
Unified representation of social media signals across all platforms:
- Platform-agnostic event structure
- Rich metadata and engagement metrics
- Location and context information
- Complete audit trail

#### BrandPlaybook
Comprehensive brand guidelines and compliance rules:
- Brand identity and voice/tone guidelines
- Compliance rules and forbidden claims
- Visual guidelines and platform-specific rules
- Regulatory compliance frameworks

#### Persona
Detailed customer archetype definitions:
- Demographics and psychographics
- Behavior patterns and platform preferences
- Triggers and response strategies
- Matching criteria for content personalization

#### AssetIntelligence
UGC and media assets with performance metadata:
- Technical specifications and usage rights
- Performance analytics across platforms
- Content analysis and optimization suggestions
- Creator attribution and licensing

#### DecisionOutput
Actions and recommendations from the decision engine:
- AI analysis results (sentiment, intent, topics)
- Decision confidence and reasoning
- Recommended actions and webhooks
- Monitoring and follow-up requirements

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run property-based tests
npm run test -- --testNamePattern="Property"

# Watch mode for development
npm run dev
```

## Database Setup

The system uses PostgreSQL with Supabase for data persistence:

```bash
# Set environment variables
export TEST_SUPABASE_URL="your-supabase-url"
export TEST_SUPABASE_ANON_KEY="your-anon-key"
export TEST_SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run migrations (when migration system is implemented)
npm run db:migrate
```

## Usage

### Basic Setup

```typescript
import { SocialIntelligenceEngine } from '@ccc/social-intelligence';

const engine = new SocialIntelligenceEngine({
  database: {
    url: process.env.SUPABASE_URL!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  platforms: {
    tiktok: {
      clientId: process.env.TIKTOK_CLIENT_ID!,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET!
    }
    // ... other platform configs
  }
});

await engine.initialize();
```

### Working with Social Events

```typescript
import { SocialEventsRepository, Platform, EventType } from '@ccc/social-intelligence';

const eventsRepo = new SocialEventsRepository();

// Create a new social event
const event = await eventsRepo.create({
  platform: Platform.TIKTOK,
  platformId: 'tiktok-post-123',
  timestamp: new Date().toISOString(),
  eventType: EventType.POST,
  content: {
    text: 'Love this new product! Where can I buy it?',
    hashtags: ['#product', '#love'],
    mentions: ['@brandname'],
    language: 'en'
  },
  author: {
    id: 'user-123',
    username: 'happy_customer',
    displayName: 'Happy Customer',
    followerCount: 1500,
    verified: false
  },
  engagement: {
    likes: 45,
    shares: 12,
    comments: 8,
    views: 2300,
    engagementRate: 0.028
  },
  metadata: {
    source: 'api',
    processingTimestamp: new Date().toISOString(),
    version: '1.0'
  }
});

// Query events
const recentEvents = await eventsRepo.findByDateRange(
  new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
  new Date(),
  { limit: 50, orderBy: 'timestamp', orderDirection: 'desc' }
);

// Search by hashtag
const hashtagEvents = await eventsRepo.findByHashtag('#product', {
  limit: 20
});

// Get engagement statistics
const stats = await eventsRepo.getEngagementStats({
  platform: Platform.TIKTOK,
  dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
});
```

## Testing

The project includes comprehensive testing with both unit tests and property-based tests:

### Unit Tests
- Validate specific examples and edge cases
- Test API integrations and error handling
- Verify business logic correctness

### Property-Based Tests
- Validate universal properties across all inputs
- Test data model consistency and validation
- Ensure system invariants hold

```bash
# Run all tests
npm test

# Run only property-based tests
npm test -- --testNamePattern="Property"

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Key Properties Tested

1. **Event Normalization**: Preserves essential data while enriching with standardized fields
2. **Unique Identification**: All events have unique identifiers with proper tracking
3. **Brand Context Dependency**: System validates brand context availability
4. **Universal Compliance**: All content complies with brand guidelines
5. **Persona Matching**: Consistent matching logic across platforms

## Development

### Project Structure

```
src/
├── types/                 # Core data models and schemas
│   ├── core.ts           # Main type definitions
│   └── __tests__/        # Type validation tests
├── database/             # Database layer
│   ├── connection.ts     # Database connection management
│   ├── repositories/     # Data access layer
│   ├── migrations/       # Database schema migrations
│   └── schema.sql        # Complete database schema
├── test/                 # Test utilities and setup
│   └── setup.ts          # Jest configuration and test helpers
└── index.ts              # Main entry point
```

### Code Quality

- **TypeScript**: Strict type checking with comprehensive type definitions
- **ESLint**: Code linting with TypeScript-specific rules
- **Zod**: Runtime schema validation for all data models
- **Jest**: Unit and property-based testing framework
- **fast-check**: Property-based testing library

### Contributing

1. Follow TypeScript strict mode guidelines
2. Add comprehensive tests for new features
3. Include property-based tests for data models
4. Update documentation for API changes
5. Ensure all tests pass before submitting

## Roadmap

### Phase 1: Core Infrastructure ✅
- [x] TypeScript monorepo structure
- [x] Core data models with Zod validation
- [x] Database schemas and migrations
- [x] Repository pattern implementation
- [x] Comprehensive testing setup

### Phase 2: Platform Integration (In Progress)
- [ ] TikTok Business API adapter
- [ ] Meta API adapter (Instagram/Facebook)
- [ ] YouTube Data API adapter
- [ ] Reddit API adapter
- [ ] RSS and web crawler adapter

### Phase 3: AI Intelligence Layer
- [ ] Sentiment analysis service
- [ ] Intent detection service
- [ ] Topic clustering and trend detection
- [ ] Confidence scoring system

### Phase 4: Decision Engine
- [ ] Priority scoring algorithm
- [ ] Rule-based decision logic
- [ ] Action execution system
- [ ] Human-in-the-loop workflows

### Phase 5: User Interface
- [ ] Social Media tab integration
- [ ] Analytics dashboard
- [ ] Content creation interface
- [ ] Publishing and scheduling system

## License

This project is part of the CCC (Centralized Commerce & Brand Command Center) system and is proprietary software.

## Support

For questions and support, please contact the development team or refer to the main CCC documentation.