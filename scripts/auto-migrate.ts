// Automated migration script - tries multiple methods
// Usage: npx tsx scripts/auto-migrate.ts

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function tryDirectConnection() {
  if (!databaseUrl) return false;

  console.log('🔌 Attempting direct database connection...');
  
  try {
    const urlMatch = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!urlMatch) {
      console.log('   ❌ Invalid connection string format\n');
      return false;
    }

    const [, user, password, host, port, database] = urlMatch;
    
    const client = new Client({
      host,
      port: parseInt(port),
      database,
      user,
      password,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });

    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    
    console.log('   ✅ Direct connection successful!\n');
    return true;
  } catch (error) {
    console.log(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    return false;
  }
}

async function runMigrationsDirect() {
  if (!databaseUrl) return false;

  const urlMatch = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!urlMatch) return false;

  const [, user, password, host, port, database] = urlMatch;
  
  const client = new Client({
    host,
    port: parseInt(port),
    database,
    user,
    password,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
    const files = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    console.log(`📦 Running ${files.length} migrations...\n`);

    for (const file of files) {
      const filePath = join(migrationsDir, file);
      const sql = readFileSync(filePath, 'utf-8');

      console.log(`🔄 ${file}...`);
      try {
        await client.query(sql);
        console.log(`   ✅ Completed\n`);
      } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
          console.log(`   ⚠️  Some objects already exist (continuing)\n`);
        } else {
          console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}\n`);
          throw error;
        }
      }
    }

    await client.end();
    console.log('🎉 All migrations completed successfully!');
    return true;
  } catch (error) {
    await client.end();
    throw error;
  }
}

async function main() {
  console.log('🚀 Automated Migration Runner\n');
  console.log('Trying multiple methods...\n');

  // Method 1: Direct connection
  const canConnect = await tryDirectConnection();
  
  if (canConnect) {
    try {
      await runMigrationsDirect();
      return;
    } catch (error) {
      console.error('❌ Migration failed:', error);
    }
  }

  // Method 2: Instructions
  console.log('\n📋 Since direct connection failed, please run migrations manually:\n');
  console.log('1. Open: https://supabase.com/dashboard/project/vryuzsnranpemohjipmw/sql/new');
  console.log('2. Log in with: maromcosmetic@gmail.com / Moringa2025!');
  console.log('3. Open file: migrations-combined.sql');
  console.log('4. Copy ALL content and paste into SQL Editor');
  console.log('5. Click "Run" (or Cmd+Enter)\n');
  console.log('File location: ' + join(process.cwd(), 'migrations-combined.sql') + '\n');
  
  process.exit(1);
}

main().catch(console.error);


