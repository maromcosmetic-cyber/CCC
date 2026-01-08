// Verify system setup
// Usage: npx tsx scripts/verify-setup.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySetup() {
  console.log('🔍 Verifying system setup...\n');

  // Check Supabase connection
  console.log('1. Checking Supabase connection...');
  try {
    const { data, error } = await supabase.from('projects').select('count').limit(1);
    if (error && error.message.includes('relation "projects" does not exist')) {
      console.log('   ⚠️  Database tables not found - migrations need to be run\n');
      console.log('   📋 Next step:');
      console.log('     1. Open: https://supabase.com/dashboard/project/vryuzsnranpemohjipmw/sql/new');
      console.log('     2. Copy content from: migrations-combined.sql');
      console.log('     3. Paste and run in SQL Editor\n');
      return false;
    } else if (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
      return false;
    } else {
      console.log('   ✅ Supabase connection successful\n');
    }
  } catch (err) {
    console.log(`   ❌ Connection failed: ${err}\n`);
    return false;
  }

  // Check environment variables
  console.log('2. Checking environment variables...');
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'CREDENTIALS_ENCRYPTION_KEY',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.log(`   ❌ Missing: ${missing.join(', ')}\n`);
    return false;
  }
  console.log('   ✅ All required environment variables set\n');

  console.log('✅ System setup verified!\n');
  console.log('🚀 Your app is ready at: http://localhost:3000\n');
  return true;
}

verifySetup().then(success => {
  process.exit(success ? 0 : 1);
});


