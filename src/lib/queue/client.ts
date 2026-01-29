// Queue client for pg-boss

import PgBoss from 'pg-boss';

let bossInstance: PgBoss | null = null;

export async function getQueueClient(): Promise<PgBoss> {
  if (bossInstance) {
    return bossInstance;
  }

  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL or SUPABASE_DB_URL must be provided');
  }

  bossInstance = new PgBoss({
    connectionString,
    schema: 'pgboss',
    retryLimit: 3,
    retryDelay: 60000, // 1 minute
    retryBackoff: true,
    deleteAfterHours: 24,
  });

  await bossInstance.start();

  return bossInstance;
}
