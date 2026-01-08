# CCC eCommerce Command Center (Merged)

Production-grade eCommerce control center with modern Commerce-Canvas UI, AI-powered workflows, and multi-platform campaign management.

## ✨ What's New

This is a **merged version** combining:
- **CCC Backend**: Full eCommerce functionality, Supabase database, API integrations, worker system
- **Commerce-Canvas UI**: Modern glassmorphism design, professional navigation, clean aesthetics

## 🎨 Features

### UI/UX
- **Modern Shell Layout**: Three-tier navigation (Master, Secondary, Topbar)
- **Glassmorphism Design**: Clean, professional enterprise aesthetic
- **Responsive**: Works on all screen sizes
- **Workspace Switching**: Multi-brand management
- **Global Search**: Quick access with ⌘K

### Functionality (From CCC)
- **Company Brain**: Web scraping and AI-powered company profile generation
- **Multi-Platform Campaigns**: Meta, Google Ads, Lazada, TikTok
- **AI-Driven Audiences**: Generate audience segments
- **UGC Video Generator**: 5-step wizard for video creation
- **WhatsApp Bot**: Remote control with permission gating
- **Cost Tracking**: Comprehensive cost ledger
- **Audit Logging**: Full audit trail

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account (or local Supabase with Docker)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   - Copy `.env.local.bak` to `.env.local`
   - Update with your Supabase credentials

3. **Run database migrations:**
   ```bash
   npm run db:migrate:api
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Open in browser:**
   ```
   http://localhost:3000
   ```

## 📁 Project Structure

```
CCC-Merged/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── studio/            # Studio section (campaigns, AI builder)
│   │   ├── brand/             # Brand section (identity, audiences)
│   │   ├── catalog/           # Catalog section (products, sync)
│   │   └── api/               # API routes (from CCC)
│   ├── components/
│   │   ├── layout/            # Shell, navigation components
│   │   ├── ui/                # shadcn/ui components (55 components)
│   │   └── features/          # Feature-specific components
│   ├── lib/
│   │   ├── providers/         # API providers (from CCC)
│   │   ├── workers/           # Job handlers (from CCC)
│   │   └── db/                # Supabase client
│   └── types/                 # TypeScript types
├── workers/                    # pg-boss worker process
├── supabase/                   # Database migrations
└── package.json               # Merged dependencies
```

## 🎯 Available Routes

### Studio
- `/studio/overview` - Dashboard with metrics and priority queue
- `/studio/campaigns` - Campaign management
- `/studio/ai-builder` - UGC video generator
- `/studio/approvals` - Approval queue

### Brand
- `/brand/overview` - Brand overview
- `/brand/identity` - Brand identity management
- `/brand/audiences` - Audience segments

### Catalog
- `/catalog/products` - Product management
- `/catalog/sync` - Integration sync

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Database Scripts

```bash
npm run db:migrate:api    # Run migrations via API
npm run db:seed:api       # Seed database with demo data
npm run verify            # Verify setup
```

## 🎨 Design System

### Colors
- **Primary**: `#2B71FF` (Blue)
- **Background**: `#F8F9FA` (Light Gray)
- **Foreground**: `#333333` (Dark Text)
- **Border**: `#E0E0E0` (Subtle Border)

### Glassmorphism Classes
- `.glass` - Translucent with blur
- `.glass-card` - Clean white cards
- `.glass-panel` - Enhanced blur for overlays
- `.liquid-glass` - Subtle navigation effect

## 📦 Key Dependencies

### UI Components
- **Radix UI**: Accessible component primitives
- **shadcn/ui**: 55 pre-built components
- **Lucide React**: Icon library
- **Framer Motion**: Animations

### Backend
- **Next.js 14**: React framework
- **Supabase**: Database and auth
- **pg-boss**: Background job queue
- **Zod**: Schema validation

## 🔧 Configuration

### Tailwind Config
Uses Commerce-Canvas theme with:
- CSS variable-based colors
- Custom animations
- Glassmorphism utilities

### TypeScript
Strict mode enabled with path aliases:
- `@/components` → `src/components`
- `@/lib` → `src/lib`
- `@/app` → `src/app`

## 🚧 Next Steps

The foundation is complete. Next priorities:
1. Connect campaigns page to CCC API
2. Integrate AI Builder (UGC video wizard)
3. Port audience generation features
4. Add media library
5. Implement control system dashboard

## 📝 License

[Your License Here]

## 🆘 Support

For issues and questions, please refer to the original CCC documentation or open an issue.

---

**Built with** ❤️ **by merging CCC functionality with Commerce-Canvas design**
