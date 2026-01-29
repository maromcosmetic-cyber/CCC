
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = 'https://vryuzsnranpemohjipmw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyeXV6c25yYW5wZW1vaGppcG13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk4NDc3OSwiZXhwIjoyMDgyNTYwNzc5fQ.flh0wWtJjgVo99JNQYJleSpIpVsbMtkpbi9_7gqmqd0';
const ENCRYPTION_KEY = '12255cacfccd28c3a3fb3967b369f054c98262fc72a3fbc135703ea1dabae9a0';
const ALGORITHM = 'aes-256-gcm';

function decrypt(encryptedData: string) {
    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }

        const [ivHex, authTagHex, encrypted] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    } catch (e: any) {
        console.error('Decryption error:', e.message);
        return null;
    }
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIntegrationCredentials() {
    const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('provider_type', 'woocommerce')
        .single();

    if (error) {
        console.error(error);
        return;
    }

    const credentials = decrypt(data.credentials_encrypted);
    console.log('CCC WooCommerce Credentials:');
    console.log(JSON.stringify(credentials, null, 2));
}

checkIntegrationCredentials();
