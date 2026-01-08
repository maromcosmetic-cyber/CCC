// Run migrations via Supabase REST API using service role
// This uses the Supabase Management API

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

async function runMigrationsViaAPI() {
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  console.log(`📦 Found ${files.length} migration files\n`);

  // Supabase doesn't have a direct SQL execution API
  // We need to use the SQL Editor API or create functions
  // For now, output instructions
  
  console.log('⚠️  Direct API migration not available due to Supabase security restrictions.\n');
  console.log('📋 Please run migrations via Supabase SQL Editor:\n');
  console.log('1. Open: https://supabase.com/dashboard/project/vryuzsnranpemohjipmw/sql/new');
  console.log('2. Copy content from: migrations-combined.sql');
  console.log('3. Paste and run\n');
  
  // Try to use the Supabase REST API to check if we can execute SQL
  // Note: Supabase doesn't expose raw SQL execution for security
  // The best approach is manual SQL Editor or Supabase CLI
  
  console.log('💡 Alternative: Use Supabase CLI (if authenticated):');
  console.log('   npx supabase link --project-ref vryuzsnranpemohjipmw');
  console.log('   npx supabase db push\n');
}

runMigrationsViaAPI();


