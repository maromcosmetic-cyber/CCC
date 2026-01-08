// Migration runner script - Executes all migrations via Supabase API
// Usage: npx tsx scripts/run-migrations.ts

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL or SUPABASE_DB_URL must be set in .env.local');
  process.exit(1);
}

async function runMigrations() {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL or SUPABASE_DB_URL environment variable is required');
  }

  // Parse connection string to handle special characters in password
  const url = new URL(databaseUrl.replace('postgresql://', 'https://'));
  const password = url.password || databaseUrl.match(/postgresql:\/\/postgres:([^@]+)@/)?.[1];

  const client = new Client({
    host: url.hostname,
    port: parseInt(url.port || '5432'),
    database: url.pathname.slice(1) || 'postgres',
    user: url.username || 'postgres',
    password: password,
    ssl: {
      rejectUnauthorized: false, // Supabase requires SSL
    },
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get migrations directory
    const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
    const files = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort(); // Sort to ensure correct order

    console.log(`📦 Found ${files.length} migration files:\n`);

    for (const file of files) {
      const filePath = join(migrationsDir, file);
      const sql = readFileSync(filePath, 'utf-8');

      console.log(`🔄 Running ${file}...`);

      try {
        await client.query(sql);
        console.log(`✅ ${file} completed\n`);
      } catch (error) {
        // Check if it's a "already exists" error (safe to ignore for some statements)
        if (error instanceof Error && error.message.includes('already exists')) {
          console.log(`⚠️  ${file} - Some objects already exist (skipping)\n`);
        } else {
          console.error(`❌ Error in ${file}:`, error);
          throw error;
        }
      }
    }

    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();

