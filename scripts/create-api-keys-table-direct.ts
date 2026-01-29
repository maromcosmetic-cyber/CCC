
import 'dotenv/config';
import { Client } from 'pg';

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
    console.error("No database connection string found in env!");
    process.exit(1);
}

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        await client.connect();
        console.log("Connected to database.");

        console.log("Creating api_keys table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS api_keys (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                consumer_key text NOT NULL UNIQUE,
                consumer_secret text NOT NULL,
                description text,
                last_access timestamp with time zone,
                created_at timestamp with time zone DEFAULT now()
            );
        `);
        console.log("Table created (or already exists).");

        const consumerKey = 'ck_7e743a2c5a014902a249033320f781a7b12d5236';
        const consumerSecret = 'cs_99c07248f7604f868726591244460f38b248a4c8';

        // Insert the key if it doesn't exist
        console.log("Inserting/Updating API Key...");
        await client.query(`
            INSERT INTO api_keys (consumer_key, consumer_secret, description)
            VALUES ($1, $2, 'CCC Integration Key')
            ON CONFLICT (consumer_key) 
            DO UPDATE SET consumer_secret = EXCLUDED.consumer_secret;
        `, [consumerKey, consumerSecret]);

        console.log("API Key ensured.");

        console.log("Verifying...");
        const res = await client.query("SELECT * FROM api_keys");
        console.log("Rows in api_keys:", res.rowCount);

    } catch (err) {
        console.error("Database error:", err);
    } finally {
        await client.end();
    }
}

main();
