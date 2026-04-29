/**
 * Verifies that ingestController writes an IngestRun record for both
 * success and failure paths.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/paperService.js', () => ({
  ingestOpenAlexBatch: vi.fn(),
  default: {},
}));

vi.mock('../services/ingestRunService.js', () => ({
  createIngestRun: vi.fn(),
  listIngestRuns: vi.fn(),
  default: {},
}));

import { ingestOpenAlexBatch } from '../services/paperService.js';
import { createIngestRun } from '../services/ingestRunService.js';
import { ingestOpenAlex } from '../controllers/ingestController.js';

const makeReq = (body = {}) => ({
  body: { query: 'test query', page: 1, perPage: 10, pages: 1, ...body },
  userId: 'user_abc',
  role: 'admin',
});

const makeRes = () => {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  return res;
};

describe('ingestController.ingestOpenAlex — logging invariant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('writes a "success" IngestRun when ingest completes without error', async () => {
    const ingestResult = {
      ingested: 10, pagesRequested: 1, pagesProcessed: 1,
      upserted: 8, modified: 2, dedupeMatched: 0,
      referencedFetched: 0, referencedInserted: 0, referencedUpdated: 0, referencedSkipped: 0,
    };
    ingestOpenAlexBatch.mockResolvedValue(ingestResult);
    createIngestRun.mockResolvedValue({});

    const req = makeReq();
    const res = makeRes();
    await ingestOpenAlex(req, res, vi.fn());

    expect(createIngestRun).toHaveBeenCalledOnce();
    const [call] = createIngestRun.mock.calls;
    expect(call[0].status).toBe('success');
    expect(call[0].query).toBe('test query');
    expect(call[0].requestedBy).toBe('user_abc');
    expect(call[0].result.ingested).toBe(10);
    expect(call[0].result.upserted).toBe(8);
  });

  it('writes a "failed" IngestRun when ingest throws', async () => {
    ingestOpenAlexBatch.mockRejectedValue(new Error('OpenAlex 502'));
    createIngestRun.mockResolvedValue({});

    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();
    await ingestOpenAlex(req, res, next);

    expect(createIngestRun).toHaveBeenCalledOnce();
    const [call] = createIngestRun.mock.calls;
    expect(call[0].status).toBe('failed');
    expect(call[0].errorMessage).toContain('OpenAlex 502');
    // Error is still forwarded so the caller gets a proper HTTP response
    expect(next).toHaveBeenCalled();
  });

  it('does NOT swallow the original error if IngestRun logging also fails', async () => {
    const originalError = new Error('OpenAlex 503');
    ingestOpenAlexBatch.mockRejectedValue(originalError);
    createIngestRun.mockRejectedValue(new Error('DB write failed'));

    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();
    await ingestOpenAlex(req, res, next);

    // Original error must still be forwarded despite log failure
    expect(next).toHaveBeenCalledWith(originalError);
  });

  it('includes durationMs in the logged run', async () => {
    ingestOpenAlexBatch.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ ingested: 1, upserted: 1, modified: 0, dedupeMatched: 0, pagesRequested: 1, pagesProcessed: 1, referencedFetched: 0, referencedInserted: 0, referencedUpdated: 0, referencedSkipped: 0 }), 5))
    );
    createIngestRun.mockResolvedValue({});

    await ingestOpenAlex(makeReq(), makeRes(), vi.fn());

    const [call] = createIngestRun.mock.calls;
    expect(call[0].durationMs).toBeGreaterThanOrEqual(0);
  });
});
