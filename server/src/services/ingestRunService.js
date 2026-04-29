import IngestRun from '../models/IngestRun.js';

export const createIngestRun = async ({
  source = 'openalex',
  query = '',
  requestedBy,
  requestedByRole = 'reader',
  options = {},
  status,
  durationMs = 0,
  result = {},
  errorMessage = '',
}) => {
  return IngestRun.create({
    source,
    query,
    requestedBy,
    requestedByRole,
    options,
    status,
    durationMs,
    result,
    errorMessage,
  });
};

export const getIngestRun = async (id) => {
  const run = await IngestRun.findById(id).lean();
  if (!run) {
    throw { status: 404, message: 'Ingest run not found' };
  }
  return run;
};

export const listIngestRuns = async ({ source, limit = 20 }) => {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));

  const filter = {};
  if (source) {
    filter.source = source;
  }

  return IngestRun.find(filter)
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .lean();
};

export default {
  createIngestRun,
  getIngestRun,
  listIngestRuns,
};
