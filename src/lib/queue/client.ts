// pg-boss queue client setup

import PgBoss from 'pg-boss';

let boss: PgBoss | null = null;

export async function getQueueClient(): Promise<PgBoss> {
  if (boss) {
    return boss;
  }

  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL or SUPABASE_DB_URL must be provided for pg-boss');
  }

  boss = new PgBoss({
    connectionString,
    schema: 'pgboss',
    retryLimit: 3,
    retryDelay: 60000, // 1 minute
    retryBackoff: true,
    deleteAfterHours: 24,
  });

  await boss.start();

  return boss;
}

export async function closeQueueClient(): Promise<void> {
  if (boss) {
    await boss.stop();
    boss = null;
  }
}


