/**
 * Structured observability alerter.
 *
 * Tracks in-memory counters for:
 *   - 5xx response rate (via express middleware)
 *   - Ingest failure streaks (consecutive failures per source)
 *   - OpenAlex upstream failure rate
 *
 * All alerts are emitted as structured Winston log entries at level 'warn'.
 * Pipe Winston's transport to PagerDuty / Slack / email in production as needed.
 *
 * No persistent state — counters reset on PM2 restart.
 */
import logger from './logger.js';

// ─── 5xx rate tracker ────────────────────────────────────────────────────────

const FIVE_XX_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const FIVE_XX_THRESHOLD = 10; // alert if 10+ 5xx in the window

let fiveXxTimestamps = [];

export const record5xx = (statusCode, path) => {
  const now = Date.now();
  fiveXxTimestamps.push(now);
  // Evict timestamps outside the window
  fiveXxTimestamps = fiveXxTimestamps.filter((t) => now - t < FIVE_XX_WINDOW_MS);

  if (fiveXxTimestamps.length >= FIVE_XX_THRESHOLD) {
    logger.warn({
      alert: '5XX_RATE_HIGH',
      message: `${fiveXxTimestamps.length} x 5xx responses in the last 5 minutes`,
      statusCode,
      recentPath: path,
      count: fiveXxTimestamps.length,
      windowMs: FIVE_XX_WINDOW_MS,
    });
  }
};

/**
 * Express middleware — attach after routes to record 5xx responses.
 * Usage: app.use(fiveXxMiddleware) (after all routes, before errorHandler).
 */
export const fiveXxMiddleware = (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 500) {
      record5xx(res.statusCode, req.path);
    }
    return originalJson(body);
  };
  next();
};

// ─── Ingest failure streak tracker ───────────────────────────────────────────

const INGEST_STREAK_THRESHOLD = 3; // alert after 3 consecutive failures

const ingestStreaks = new Map(); // source → consecutive failure count

export const recordIngestOutcome = (source, succeeded) => {
  if (succeeded) {
    ingestStreaks.set(source, 0);
    return;
  }
  const streak = (ingestStreaks.get(source) || 0) + 1;
  ingestStreaks.set(source, streak);

  if (streak >= INGEST_STREAK_THRESHOLD) {
    logger.warn({
      alert: 'INGEST_FAILURE_STREAK',
      message: `${streak} consecutive ingest failures for source "${source}"`,
      source,
      streakCount: streak,
      threshold: INGEST_STREAK_THRESHOLD,
    });
  }
};

export const alertOnIngestFailure = ({ query, errorMessage, source = 'openalex' }) => {
  recordIngestOutcome(source, false);
  logger.warn({
    alert: 'INGEST_FAILED',
    message: `Ingest failed for source "${source}", query "${query}"`,
    source,
    query,
    errorMessage,
  });
};

export const alertOnIngestSuccess = (source = 'openalex') => {
  recordIngestOutcome(source, true);
};

// ─── OpenAlex upstream failure tracker ───────────────────────────────────────

const OA_FAILURE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const OA_FAILURE_THRESHOLD = 5;

let oaFailureTimestamps = [];

export const recordOpenAlexFailure = (statusCode) => {
  const now = Date.now();
  oaFailureTimestamps.push(now);
  oaFailureTimestamps = oaFailureTimestamps.filter((t) => now - t < OA_FAILURE_WINDOW_MS);

  if (oaFailureTimestamps.length >= OA_FAILURE_THRESHOLD) {
    logger.warn({
      alert: 'OPENALEX_UPSTREAM_FAILURES',
      message: `${oaFailureTimestamps.length} OpenAlex upstream failures in the last 10 minutes`,
      upstreamStatusCode: statusCode,
      count: oaFailureTimestamps.length,
      windowMs: OA_FAILURE_WINDOW_MS,
    });
  }
};

// ─── Diagnostic summary (useful to call from an admin endpoint) ───────────────

export const getAlertSummary = () => ({
  fiveXxCountInWindow: fiveXxTimestamps.filter((t) => Date.now() - t < FIVE_XX_WINDOW_MS).length,
  fiveXxWindowMs: FIVE_XX_WINDOW_MS,
  ingestStreaks: Object.fromEntries(ingestStreaks),
  openAlexFailuresInWindow: oaFailureTimestamps.filter(
    (t) => Date.now() - t < OA_FAILURE_WINDOW_MS
  ).length,
  openAlexFailureWindowMs: OA_FAILURE_WINDOW_MS,
});

export default {
  fiveXxMiddleware,
  record5xx,
  alertOnIngestFailure,
  alertOnIngestSuccess,
  recordOpenAlexFailure,
  getAlertSummary,
};
