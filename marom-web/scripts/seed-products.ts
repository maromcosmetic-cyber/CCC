
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = "https://vryuzsnranpemohjipmw.supabase.co";
const supabaseServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyeXV6c25yYW5wZW1vaGppcG13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk4NDc3OSwiZXhwIjoyMDgyNTYwNzc5fQ.flh0wWtJjgVo99JNQYJleSpIpVsbMtkpbi9_7gqmqd0";
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const initialProducts = [
    {
        name: "Moringa & Reishi Hair Serum",
        description: "Botanical Elixir for Strength & Shine. 50ml.",
        price: 249.00,
        stock_status: 'in_stock',
        images: ["/prod-serum.png"]
    },
    {
        name: "Moringa Infusion Shampoo",
        description: "Nourishing & Restorative. 500ml.",
        price: 349.00,
        stock_status: 'in_stock',
        images: ["/prod-shampoo.png"]
    },
    {
        name: "Moringa & Keratin Conditioner",
        description: "Deep conditioning with natural proteins.",
        price: 319.00,
        stock_status: 'in_stock',
        images: ["/prod-conditioner.png"]
    },
    {
        name: "Natural Mosquito Repellent",
        description: "Eucalyptus & Citronella. Natural Protection.",
        price: 289.00,
        stock_status: 'in_stock',
        images: ["/prod-spray.png"]
    }
];

async function seed() {
    console.log("Checking for projects...");
    let { data: projects, error: pError } = await supabase.from('projects').select('id').limit(1);

    if (pError) {
        console.error("Error fetching projects:", pError);
        return;
    }

    let projectId;

    if (!projects || projects.length === 0) {
        console.log("No projects found. Creating a default project...");
        // We need a user_id for the project. Let's see if we can get a user or create one, 
        // or if we can bypass the user_id check (it's NOT NULL). 
        // Since we are admin, we can query auth.users? accessing auth schema via API is tricky.
        // For now, let's try to just insert without user_id and see, or fail.
        // Actually, usually we can't insert into projects without a valid user foreign key.

        // Attempting to fetch a user ID from auth.users is not directly supported via standard client usually.
        // Let's rely on the fact the user might have *some* user if they logged in, but here they might not have.
        // If no user exists, we are stuck unless we create a user.
        // BUT, the existing codebase seems to be a workspace for a "User", so maybe there is a user.
        // I'll try to find *any* user ID if I can, or hardcode a fake UUID if constraints allow (unlikely).

        // Alternate strategy: Check if there are any users.
        const { data: users, error: uError } = await supabase.auth.admin.listUsers();
        if (uError || !users.users.length) {
            console.error("No users found to assign project to. Cannot seed.", uError);
            return;
        }
        const userId = users.users[0].id;
        console.log("Found user:", userId);

        const { data: newProject, error: npError } = await supabase
            .from('projects')
            .insert({
                name: "Marom Default",
                website_url: "https://maromcosmetic.com",
                monthly_budget_amount: 0,
                user_id: userId
            })
            .select()
            .single();

        if (npError) {
            console.error("Failed to create project:", npError);
            return;
        }
        projectId = newProject.id;
    } else {
        projectId = projects[0].id;
        console.log("Using existing project:", projectId);
    }

    console.log("Checking for products...");
    const { count, error: cError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

    if (cError) {
        console.error("Error checking products:", cError);
        return;
    }

    if (count === 0) {
        console.log("No products found. Seeding...");
        const productsToInsert = initialProducts.map(p => ({
            ...p,
            project_id: projectId
        }));

        const { error: iError } = await supabase.from('products').insert(productsToInsert);
        if (iError) {
            console.error("Error inserting products:", iError);
        } else {
            console.log("Successfully seeded 4 products!");
        }
    } else {
        console.log(`Found ${count} products. Skipping seed.`);
    }
}

seed();
