// Database seeding script - Executes seed.sql via Supabase API
// Usage: npx tsx scripts/seed-database.ts

import { readFileSync } from 'fs';
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

async function seedDatabase() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false, // Supabase requires SSL
    },
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read seed file
    const seedPath = join(process.cwd(), 'supabase', 'seed.sql');
    const sql = readFileSync(seedPath, 'utf-8');

    console.log('🌱 Seeding database...\n');

    try {
      await client.query(sql);
      console.log('✅ Database seeded successfully!');
    } catch (error) {
      console.error('❌ Error seeding database:', error);
      throw error;
    }
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedDatabase();


