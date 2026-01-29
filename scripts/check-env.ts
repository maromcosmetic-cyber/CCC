
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('✅ SUPABASE_SERVICE_ROLE_KEY is present');
} else {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is MISSING');
}
