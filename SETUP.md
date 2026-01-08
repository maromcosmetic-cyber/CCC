# Setup Guide - Run Migrations via API

## Quick Start

### 1. Update Database Password

Before running migrations, you need to update the database password in `.env.local`:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/vryuzsnranpemohjipmw
2. Go to **Settings** → **Database**
3. Find your database password (or reset it if needed)
4. Update `.env.local`:
   ```env
   DATABASE_URL=postgresql://postgres:[YOUR-ACTUAL-PASSWORD]@db.vryuzsnranpemohjipmw.supabase.co:5432/postgres
   SUPABASE_DB_URL=postgresql://postgres:[YOUR-ACTUAL-PASSWORD]@db.vryuzsnranpemohjipmw.supabase.co:5432/postgres
   ```
   Replace `[YOUR-ACTUAL-PASSWORD]` with your real database password.

### 2. Run Database Migrations

```bash
npm run db:migrate:api
```

This will:
- Connect to your Supabase database
- Run all migrations in order (001, 002, 003, 004, 005, 006)
- Create all tables, indexes, RLS policies, triggers, and storage buckets

### 3. (Optional) Seed Database with Demo Data

```bash
npm run db:seed:api
```

This will populate the database with sample data for testing.

### 4. Start the Application

```bash
# Terminal 1: Main app
npm run dev

# Terminal 2: Workers (optional, for background jobs)
cd workers
npm run dev
```

### 5. Open the App

Go to: http://localhost:3000

## Available Scripts

- `npm run db:migrate:api` - Run all migrations via API
- `npm run db:seed:api` - Seed database with demo data via API
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

## Troubleshooting

### "Connection refused" or "password authentication failed"
- Make sure `DATABASE_URL` has the correct password
- Check that your Supabase project is active
- Verify the database password in Supabase Dashboard

### "relation already exists"
- Some migrations may have already run
- This is safe to ignore - the script will continue

### "SSL required"
- The script already handles SSL, but if you get SSL errors:
  - Make sure you're using the correct connection string format
  - Check Supabase Dashboard for the correct connection string

## What Gets Created

After running migrations, you'll have:

- **Tables**: projects, scrape_runs, company_profiles, campaigns, audience_segments, products, integrations, ugc_videos, etc.
- **Indexes**: For performance optimization
- **RLS Policies**: Row-level security for data isolation
- **Triggers**: Automatic versioning and timestamp updates
- **Storage Buckets**: For files (scraped-content, media-assets, generated-assets, ugc-videos, company-profile-artifacts)
- **Prompt Templates**: Pre-configured AI prompts

## Next Steps

1. ✅ Run migrations: `npm run db:migrate:api`
2. ✅ (Optional) Seed data: `npm run db:seed:api`
3. ✅ Start app: `npm run dev`
4. ✅ Configure user API keys via Control System UI
5. ✅ Create your first project!


