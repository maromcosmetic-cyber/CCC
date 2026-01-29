
import 'dotenv/config';
import { Client } from 'pg';

const connectionString = 'postgresql://postgres:tuzqi8-rozfif-jarwUz@db.psswhtcpjenmbztlbilo.supabase.co:5432/postgres';

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        console.log("Connecting to psswht... DB...");
        await client.connect();
        console.log("Connected!");

        console.log("Adding name_he column...");
        await client.query(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS name_he text;
        `);

        console.log("Adding description_he column...");
        await client.query(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS description_he text;
        `);

        console.log("Columns added successfully.");

    } catch (err) {
        console.error("Database error:", err);
    } finally {
        await client.end();
    }
}

main();
