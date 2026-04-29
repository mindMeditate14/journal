import { ingestOpenAlexBatch } from '../services/paperService.js';
import { createIngestRun, getIngestRun, listIngestRuns } from '../services/ingestRunService.js';
import { alertOnIngestFailure, alertOnIngestSuccess } from '../utils/alerter.js';

export const ingestOpenAlex = async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const {
      query = 'ayurveda',
      page = 1,
      perPage = 25,
      pages = 1,
      includeReferencedWorks = false,
      maxReferencedPerWork = 8,
    } = req.body || {};

    const data = await ingestOpenAlexBatch({
      query,
      page,
      perPage,
      pages,
      includeReferencedWorks,
      maxReferencedPerWork,
    });

    await createIngestRun({
      source: 'openalex',
      query,
      requestedBy: req.userId,
      requestedByRole: req.role,
      options: {
        page,
        perPage,
        pages,
        includeReferencedWorks,
        maxReferencedPerWork,
      },
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

    alertOnIngestSuccess('openalex');
    res.status(201).json(data);
  } catch (error) {
    alertOnIngestFailure({
      query: (req.body && req.body.query) || 'ayurveda',
      errorMessage: error?.message || 'Unknown ingest failure',
      source: 'openalex',
    });
    try {
      await createIngestRun({
        source: 'openalex',
        query: (req.body && req.body.query) || 'ayurveda',
        requestedBy: req.userId,
        requestedByRole: req.role,
        options: {
          page: (req.body && req.body.page) || 1,
          perPage: (req.body && req.body.perPage) || 25,
          pages: (req.body && req.body.pages) || 1,
          includeReferencedWorks: (req.body && req.body.includeReferencedWorks) || false,
          maxReferencedPerWork: (req.body && req.body.maxReferencedPerWork) || 8,
        },
        status: 'failed',
        durationMs: Date.now() - startedAt,
        errorMessage: error?.message || 'Unknown ingest failure',
      });
    } catch (logError) {
      // Keep ingestion error path intact even if history logging fails.
      console.warn('Failed to write ingest run history:', logError?.message || logError);
    }

    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
};

export const getIngestRuns = async (req, res, next) => {
  try {
    const { source = 'openalex', limit = 20 } = req.query || {};
    const runs = await listIngestRuns({ source, limit });
    res.json({ runs });
  } catch (error) {
    next(error);
  }
};

export const retryIngestRun = async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const originalRun = await getIngestRun(req.params.id);

    if (originalRun.status !== 'failed') {
      return res.status(400).json({ error: 'Only failed ingest runs can be retried' });
    }

    const { query, source, options = {} } = originalRun;
    const {
      page = 1,
      perPage = 25,
      pages = 1,
      includeReferencedWorks = false,
      maxReferencedPerWork = 8,
    } = options;

    const data = await ingestOpenAlexBatch({
      query,
      page,
      perPage,
      pages,
      includeReferencedWorks,
      maxReferencedPerWork,
    });

    await createIngestRun({
      source: source || 'openalex',
      query,
      requestedBy: req.userId,
      requestedByRole: req.role,
      options: { page, perPage, pages, includeReferencedWorks, maxReferencedPerWork },
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

    res.status(201).json({ ...data, retriedFrom: req.params.id });
  } catch (error) {
    try {
      const originalRun = await getIngestRun(req.params.id).catch(() => null);
      await createIngestRun({
        source: 'openalex',
        query: originalRun?.query || '',
        requestedBy: req.userId,
        requestedByRole: req.role,
        options: originalRun?.options || {},
        status: 'failed',
        durationMs: Date.now() - startedAt,
        errorMessage: error?.message || 'Unknown retry failure',
      });
    } catch (logError) {
      console.warn('Failed to write retry ingest run history:', logError?.message);
    }
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
};

export default {
  ingestOpenAlex,
  getIngestRuns,
  retryIngestRun,
};