import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://vryuzsnranpemohjipmw.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyeXV6c25yYW5wZW1vaGppcG13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5ODQ3NzksImV4cCI6MjA4MjU2MDc3OX0.8pCpiF6el63TNjBIEPjeSVLyp6MHDfQdEv_cOGWHCRM";
const supabaseServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyeXV6c25yYW5wZW1vaGppcG13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk4NDc3OSwiZXhwIjoyMDgyNTYwNzc5fQ.flh0wWtJjgVo99JNQYJleSpIpVsbMtkpbi9_7gqmqd0";

// Client for client-side operations (respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (bypasses RLS)
// Use this only in Server Components or API Routes
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
    }
});
