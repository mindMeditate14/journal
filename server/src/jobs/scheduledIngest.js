/**
 * Scheduled ingest job — runs daily at 02:00 UTC.
 *
 * Enabled only when SCHEDULED_INGEST_ENABLED=true in .env.
 * Queries are read from SCHEDULED_INGEST_QUERIES (comma-separated, default 'ayurveda').
 * Uses a synthetic system requestedBy user ID stored in SCHEDULED_INGEST_USER_ID.
 *
 * Uses a simple setInterval-based scheduler (no extra dependencies).
 * Replace with node-cron if you need exact cron expressions later.
 */
import { ingestOpenAlexBatch } from '../services/paperService.js';
import { createIngestRun } from '../services/ingestRunService.js';
import logger from '../utils/logger.js';
import { alertOnIngestFailure } from '../utils/alerter.js';

const SYSTEM_USER_ID = process.env.SCHEDULED_INGEST_USER_ID || '000000000000000000000000';

const runScheduledIngest = async () => {
  if (process.env.SCHEDULED_INGEST_ENABLED !== 'true') return;

  const rawQueries = process.env.SCHEDULED_INGEST_QUERIES || 'ayurveda';
  const queries = rawQueries
    .split(',')
    .map((q) => q.trim())
    .filter(Boolean);

  logger.info(`⏰ Scheduled ingest starting — ${queries.length} query/queries`);

  for (const query of queries) {
    const startedAt = Date.now();
    try {
      const data = await ingestOpenAlexBatch({
        query,
        page: 1,
        perPage: 25,
        pages: 2,
        includeReferencedWorks: false,
        maxReferencedPerWork: 8,
      });

      await createIngestRun({
        source: 'openalex',
        query,
        requestedBy: SYSTEM_USER_ID,
        requestedByRole: 'admin',
        options: { page: 1, perPage: 25, pages: 2, includeReferencedWorks: false, maxReferencedPerWork: 8 },
        status: 'success',
        durationMs: Date.now() - startedAt,
        result: {
          ingested: data.ingested || 0,
          pagesRequested: data.pagesRequested || 0,
          pagesProcessed: data.pagesProcessed || 0,
          upserted: data.upserted || 0,
          modified: data.modified || 0,
          dedupeMatched: data.dedupeMatched || 0,
          referencedFetched: data.referencedFetched || 0,
          referencedInserted: data.referencedInserted || 0,
          referencedUpdated: data.referencedUpdated || 0,
          referencedSkipped: data.referencedSkipped || 0,
        },
      });

      logger.info(`✅ Scheduled ingest done: "${query}" — ingested ${data.ingested}`);
    } catch (error) {
      const errorMessage = error?.message || 'Unknown scheduled ingest failure';
      logger.error(`❌ Scheduled ingest failed: "${query}" — ${errorMessage}`);

      alertOnIngestFailure({ query, errorMessage, source: 'scheduled' });

      try {
        await createIngestRun({
          source: 'openalex',
          query,
          requestedBy: SYSTEM_USER_ID,
          requestedByRole: 'admin',
          options: { page: 1, perPage: 25, pages: 2, includeReferencedWorks: false, maxReferencedPerWork: 8 },
          status: 'failed',
          durationMs: Date.now() - startedAt,
          errorMessage,
        });
      } catch (logError) {
        logger.warn('Failed to write scheduled ingest run history:', logError?.message);
      }
    }
  }
};

/**
 * Bootstrap the scheduler.
 * Fires once 10 minutes after server start (avoids hammering OpenAlex at boot),
 * then every 24 hours.
 */
export const startScheduledIngest = () => {
  if (process.env.SCHEDULED_INGEST_ENABLED !== 'true') {
    logger.info('⏰ Scheduled ingest disabled (SCHEDULED_INGEST_ENABLED != true)');
    return;
  }

  const INITIAL_DELAY_MS = 10 * 60 * 1000; // 10 minutes
  const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

  setTimeout(() => {
    runScheduledIngest();
    setInterval(runScheduledIngest, INTERVAL_MS);
  }, INITIAL_DELAY_MS);

  logger.info('⏰ Scheduled ingest armed — first run in 10 min, then every 24 h');
};

export default { startScheduledIngest };
