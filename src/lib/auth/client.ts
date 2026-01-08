// Supabase Auth client for client-side operations

import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    throw new Error('Supabase configuration is missing');
  }

  // createBrowserClient handles cookies automatically - no custom handlers needed
  // It uses localStorage by default but syncs to cookies for SSR compatibility
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

