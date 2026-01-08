// Print all migrations as a single SQL file
// Copy the output and paste into Supabase SQL Editor

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
const files = readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort();

console.log('-- ============================================');
console.log('-- CCC Database Migrations');
console.log('-- Copy everything below and paste into Supabase SQL Editor');
console.log('-- ============================================\n');

for (const file of files) {
  const filePath = join(migrationsDir, file);
  const sql = readFileSync(filePath, 'utf-8');
  
  console.log(`-- ============================================`);
  console.log(`-- Migration: ${file}`);
  console.log('-- ============================================\n');
  console.log(sql);
  console.log('\n');
}

console.log('-- ============================================');
console.log('-- End of Migrations');
console.log('-- ============================================');


