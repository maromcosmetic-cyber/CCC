// Worker entry point - pg-boss job processor

import PgBoss from 'pg-boss';
import { runScrapeJob } from '../../src/lib/workers/scrape';
import { buildCompanyProfileJob } from '../../src/lib/workers/company-profile';
import { generateAudienceJob } from '../../src/lib/workers/audience';
import { generateStrategyJob } from '../../src/lib/workers/strategy';
import { generateCalendarJob } from '../../src/lib/workers/calendar';
import { generateAssetsJob } from '../../src/lib/workers/assets';
import { generateUGCVideoJob } from '../../src/lib/workers/ugc-video';
import { JOB_TYPES } from '../../src/lib/queue/jobs';

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL or SUPABASE_DB_URL must be provided');
}

const boss = new PgBoss({
  connectionString,
  schema: 'pgboss',
  retryLimit: 3,
  retryDelay: 60000, // 1 minute
  retryBackoff: true,
  deleteAfterHours: 24,
});

// Register job handlers
boss.work(JOB_TYPES.RUN_SCRAPE, async (job) => {
  console.log(`Processing ${JOB_TYPES.RUN_SCRAPE} job:`, job.id);
  await runScrapeJob(job.data as any);
});

boss.work(JOB_TYPES.BUILD_COMPANY_PROFILE, async (job) => {
  console.log(`Processing ${JOB_TYPES.BUILD_COMPANY_PROFILE} job:`, job.id);
  await buildCompanyProfileJob(job.data as any);
});

boss.work(JOB_TYPES.GENERATE_AUDIENCE, async (job) => {
  console.log(`Processing ${JOB_TYPES.GENERATE_AUDIENCE} job:`, job.id);
  await generateAudienceJob(job.data as any);
});

boss.work(JOB_TYPES.GENERATE_STRATEGY, async (job) => {
  console.log(`Processing ${JOB_TYPES.GENERATE_STRATEGY} job:`, job.id);
  await generateStrategyJob(job.data as any);
});

boss.work(JOB_TYPES.GENERATE_CALENDAR, async (job) => {
  console.log(`Processing ${JOB_TYPES.GENERATE_CALENDAR} job:`, job.id);
  await generateCalendarJob(job.data as any);
});

boss.work(JOB_TYPES.GENERATE_ASSETS, async (job) => {
  console.log(`Processing ${JOB_TYPES.GENERATE_ASSETS} job:`, job.id);
  await generateAssetsJob(job.data as any);
});

boss.work(JOB_TYPES.GENERATE_UGC_VIDEO, async (job) => {
  console.log(`Processing ${JOB_TYPES.GENERATE_UGC_VIDEO} job:`, job.id);
  await generateUGCVideoJob(job.data as any);
});

// Start the worker
boss.start()
  .then(() => {
    console.log('Worker started successfully');
  })
  .catch((error) => {
    console.error('Failed to start worker:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await boss.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await boss.stop();
  process.exit(0);
});


