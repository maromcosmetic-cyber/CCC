
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserProject() {
    const email = 'maromcosmetic@gmail.com';
    console.log(`Checking user: ${email}`);

    const { data: userData, error: uError } = await supabase.auth.admin.listUsers();
    if (uError) {
        console.error('Error listing users:', uError);
        return;
    }

    const user = userData.users.find(u => u.email === email);
    if (!user) {
        console.error('User not found in Auth');
        return;
    }

    console.log(`User ID: ${user.id}`);

    const { data: projectUsers, error: puError } = await supabase
        .from('project_users')
        .select('*')
        .eq('user_id', user.id);

    if (puError) {
        console.error('Error fetching project_users:', puError);
    } else {
        console.log('Project Users entries:', projectUsers.length);
        for (const pu of projectUsers) {
            console.log(` - Project ID: ${pu.project_id}, Role: ${pu.role}`);
        }
    }

    const { data: projects, error: pError } = await supabase
        .from('projects')
        .select('*');

    if (pError) {
        console.error('Error fetching projects:', pError);
    } else {
        console.log('\nTotal Projects in DB:', projects.length);
        for (const p of projects) {
            console.log(` - ${p.name} (${p.id}), Owner: ${p.user_id}`);
        }
    }
}

checkUserProject();
