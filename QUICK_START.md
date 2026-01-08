# Quick Start Guide

## Option 1: Using Local Supabase (Requires Docker)

1. **Start Docker Desktop** (if not running)

2. **Run the setup script:**
   ```bash
   ./setup.sh
   ```

3. **Start the app:**
   ```bash
   npm run dev
   ```

4. **Open:** http://localhost:3000

---

## Option 2: Using Cloud Supabase

1. **Create a Supabase project** at https://supabase.com

2. **Update `.env.local`** with your cloud Supabase credentials:
   - Get them from: Project Settings > API
   - Update these values:
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
     ```

3. **Run migrations** (using Supabase SQL Editor or CLI):
   - Copy all SQL from `supabase/migrations/*.sql` files
   - Run them in Supabase SQL Editor

4. **Seed the database:**
   - Copy `supabase/seed.sql` content
   - Run in Supabase SQL Editor

5. **Start the app:**
   ```bash
   npm run dev
   ```

---

## If Docker is Not Available

The app will still run, but database features won't work. You can:
- See the UI and test the frontend
- API calls will fail (expected without database)

To fully test, you need either:
- Docker Desktop + Local Supabase, OR
- Cloud Supabase account
