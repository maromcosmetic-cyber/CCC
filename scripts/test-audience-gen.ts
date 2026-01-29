
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Helper to run main logic
async function run() {
    console.log("🚀 Starting Audience Generation Test...");

    // Dynamic imports to ensure env vars are loaded first
    const { createServiceRoleClient } = await import('../src/lib/auth/server');
    const { generateStrategicAudiences } = await import('../src/lib/ai/audience-generation');

    try {
        const supabase = createServiceRoleClient();

        // Get first project
        const { data: project, error } = await supabase
            .from('projects')
            .select('id, name')
            .limit(1)
            .single();

        if (error || !project) {
            console.error("❌ No project found to test with.");
            return;
        }

        console.log(`📂 Testing with Project: ${project.name} (${project.id})`);

        // Run Generation
        console.log("⏳ Calling generateStrategicAudiences...");
        const audiences = await generateStrategicAudiences(project.id);

        console.log("\n✅ SUCCESS! Generated Audiences:");
        console.log(JSON.stringify(audiences, null, 2));

    } catch (e: any) {
        console.error("\n❌ CRASHED:", e);
        console.error("Stack:", e.stack);
    }
}

run();
