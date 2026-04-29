/**
 * Tests for manuscript draft and PDF extraction endpoints.
 * Focus: controller invariants and new draft-aware submission behavior.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../models/Manuscript.js', () => {
  const create = vi.fn();
  const findById = vi.fn();
  const find = vi.fn();
  const countDocuments = vi.fn();

  class ManuscriptMock {
    constructor(payload = {}) {
      Object.assign(this, payload);
      if (!this._id) this._id = 'ms-new';
      if (!this.submissionId) this.submissionId = 'NJ-TEST-001';
      if (!this.authors) this.authors = [];
      this.save = vi.fn().mockResolvedValue(this);
    }
  }

  ManuscriptMock.create = create;
  ManuscriptMock.findById = findById;
  ManuscriptMock.find = find;
  ManuscriptMock.countDocuments = countDocuments;

  return {
    default: ManuscriptMock,
  };
});

vi.mock('../models/Journal.js', () => ({
  default: {
    findById: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('../models/Paper.js', () => ({
  default: {
    create: vi.fn(),
  },
}));

vi.mock('../services/manuscriptDraftService.js', () => ({
  extractPdfMetadata: vi.fn(),
  buildDraftQuality: vi.fn(),
}));

vi.mock('../services/manuscriptAiService.js', () => ({
  generateOutline: vi.fn(),
  generateSectionDraft: vi.fn(),
  generateStructuredDraft: vi.fn(),
  generateClinicalDraft: vi.fn(),
}));

vi.mock('../utils/zenodoService.js', () => ({
  registerZenodoDOI: vi.fn(),
}));

import Manuscript from '../models/Manuscript.js';
import Journal from '../models/Journal.js';
import { buildDraftQuality, extractPdfMetadata } from '../services/manuscriptDraftService.js';
import {
  generateClinicalDraft,
  generateStructuredDraft,
} from '../services/manuscriptAiService.js';
import {
  assignReviewers,
  createDraft,
  createDraftFromPdf,
  extractMetadataFromPdf,
  generateAiClinicalDraft,
  generateAiStructuredDraft,
  getExtractionReport,
  listManuscripts,
  submitManuscript,
} from '../controllers/manuscriptController.js';

const makeRes = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
});

const makeReq = (overrides = {}) => ({
  user: { _id: 'user-1', email: 'author@example.com', role: 'researcher' },
  userId: 'user-1',
  role: 'researcher',
  body: {},
  params: {},
  ...overrides,
});

describe('manuscript draft endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildDraftQuality.mockReturnValue({ completenessScore: 70, validationState: 'review_needed' });
    generateStructuredDraft.mockResolvedValue({
      body: 'Generated structured body',
      keywords: ['ai', 'draft'],
      sectionHeadings: ['Introduction', 'Methods'],
    });
    generateClinicalDraft.mockResolvedValue({
      body: 'Generated clinical body',
      keywords: ['clinical'],
      sectionHeadings: ['Introduction', 'Case Presentation'],
    });
  });

  it('extractMetadataFromPdf returns 400 when file missing', async () => {
    const req = makeReq();
    const res = makeRes();

    await extractMetadataFromPdf(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'PDF file is required' });
  });

  it('extractMetadataFromPdf returns extracted payload when PDF is provided', async () => {
    const req = makeReq({
      file: {
        mimetype: 'application/pdf',
        buffer: Buffer.from('pdf-bytes'),
        originalname: 'test.pdf',
        size: 1234,
      },
    });
    const res = makeRes();

    extractPdfMetadata.mockResolvedValue({ title: 'Extracted title', abstract: 'Extracted abstract' });

    await extractMetadataFromPdf(req, res, vi.fn());

    expect(extractPdfMetadata).toHaveBeenCalledOnce();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      extracted: { title: 'Extracted title', abstract: 'Extracted abstract' },
    });
  });

  it('createDraft persists a draft with owner/submittedBy and quality fields', async () => {
    const req = makeReq({
      body: {
        sourcePath: 'ai_wizard',
        title: 'Draft title',
        abstract: 'Draft abstract',
        body: 'Draft body content',
        discipline: 'Medicine',
        methodology: 'case-study',
        authors: [{ name: 'A', email: 'a@example.com' }],
      },
    });
    const res = makeRes();

    Manuscript.create.mockResolvedValue({ _id: 'ms-1', status: 'draft' });

    await createDraft(req, res, vi.fn());

    expect(Manuscript.create).toHaveBeenCalledOnce();
    const payload = Manuscript.create.mock.calls[0][0];
    expect(payload.owner).toBe('user-1');
    expect(payload.submittedBy).toBe('user-1');
    expect(payload.status).toBe('draft');
    expect(payload.completenessScore).toBe(70);
    expect(payload.validationState).toBe('review_needed');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('createDraftFromPdf rejects non-PDF files', async () => {
    const req = makeReq({
      file: {
        mimetype: 'text/plain',
        buffer: Buffer.from('not pdf'),
        originalname: 'bad.txt',
        size: 25,
      },
    });
    const res = makeRes();

    await createDraftFromPdf(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Only PDF files are supported' });
  });

  it('createDraftFromPdf creates draft using extracted metadata', async () => {
    const req = makeReq({
      file: {
        mimetype: 'application/pdf',
        buffer: Buffer.from('pdf-bytes'),
        originalname: 'paper.pdf',
        size: 5050,
      },
      body: { journalId: 'j-1' },
    });
    const res = makeRes();

    extractPdfMetadata.mockResolvedValue({
      title: 'PDF Title',
      abstract: 'PDF Abstract',
      body: 'PDF body',
      keywords: ['k1'],
      authors: [{ name: 'PDF Author', email: '' }],
      metadata: { extractionWarnings: [] },
      extractionReport: { parser: 'pdf-parse' },
    });

    Manuscript.create.mockResolvedValue({ _id: 'ms-pdf-1', status: 'draft' });

    await createDraftFromPdf(req, res, vi.fn());

    expect(extractPdfMetadata).toHaveBeenCalledOnce();
    expect(Manuscript.create).toHaveBeenCalledOnce();
    const payload = Manuscript.create.mock.calls[0][0];
    expect(payload.sourcePath).toBe('pdf_import');
    expect(payload.title).toBe('PDF Title');
    expect(payload.owner).toBe('user-1');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('submitManuscript supports draftId and marks draft as submitted', async () => {
    const req = makeReq({
      body: {
        draftId: 'draft-1',
        journalId: 'journal-1',
        title: 'Valid manuscript title for submit',
        abstract: 'This abstract is long enough to pass validation and includes required context.',
        authors: [{ name: 'Author One', email: 'author1@example.com' }],
        body: 'x'.repeat(1200),
        discipline: 'Medicine',
        methodology: 'case-study',
      },
    });
    const res = makeRes();

    const draftDoc = {
      _id: 'draft-1',
      submissionId: 'NJ-DRAFT-1',
      submittedBy: { toString: () => 'user-1' },
      authors: [{ name: 'Author One', email: 'author1@example.com' }],
      save: vi.fn().mockResolvedValue(true),
    };

    Manuscript.findById.mockResolvedValue(draftDoc);
    Journal.findById.mockResolvedValue({ _id: 'journal-1', isOpen: true });

    await submitManuscript(req, res, vi.fn());

    expect(Manuscript.findById).toHaveBeenCalledWith('draft-1');
    expect(draftDoc.status).toBe('submitted');
    expect(draftDoc.save).toHaveBeenCalledOnce();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        manuscript: expect.objectContaining({ _id: 'draft-1', status: 'submitted' }),
      })
    );
  });

  it('getExtractionReport returns 403 for non-owner non-admin', async () => {
    const req = makeReq({
      params: { id: 'm-1' },
      user: { _id: 'user-1', role: 'researcher' },
    });
    const res = makeRes();

    const findByIdChain = {
      select: vi.fn().mockResolvedValue({
        submittedBy: { toString: () => 'user-2' },
        extractionReport: { parser: 'pdf-parse' },
        metadata: { extractionConfidence: {}, extractionWarnings: [] },
      }),
    };

    Manuscript.findById.mockReturnValue(findByIdChain);

    await getExtractionReport(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('generateAiStructuredDraft validates required fields', async () => {
    const req = makeReq({ body: { title: '', abstract: '' } });
    const res = makeRes();

    await generateAiStructuredDraft(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'title and abstract are required' });
  });

  it('generateAiClinicalDraft returns generated draft payload', async () => {
    const req = makeReq({
      body: {
        title: 'Clinical title',
        abstract: 'Clinical abstract',
        condition: 'Condition',
        intervention: 'Intervention',
        outcome: 'Outcome',
      },
    });
    const res = makeRes();

    await generateAiClinicalDraft(req, res, vi.fn());

    expect(generateClinicalDraft).toHaveBeenCalledOnce();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      draft: expect.objectContaining({ body: 'Generated clinical body' }),
    });
  });

  it('listManuscripts returns editorial queue for editor role', async () => {
    const req = makeReq({
      user: { _id: 'editor-1', role: 'editor' },
      roles: ['editor'],
      role: 'editor',
      query: { status: 'submitted,under-review', page: '1', limit: '20' },
    });
    const res = makeRes();

    Journal.find.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ _id: 'j-1' }]),
      }),
    });

    const chain = {
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      skip: vi.fn().mockResolvedValue([{ _id: 'm-1', status: 'submitted' }]),
    };

    Manuscript.find.mockReturnValue(chain);
    Manuscript.countDocuments.mockResolvedValue(1);

    await listManuscripts(req, res, vi.fn());

    expect(Manuscript.find).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.any(Array),
        status: { $in: ['submitted', 'under-review'] },
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        manuscripts: expect.any(Array),
        pagination: expect.objectContaining({ total: 1 }),
      })
    );
  });

  it('assignReviewers rejects invalid reviewer ids with 400', async () => {
    const req = makeReq({
      params: { id: 'm-1' },
      body: { reviewerIds: ['reviewer1'] },
      user: { _id: 'admin-1', role: 'admin' },
      roles: ['admin'],
      role: 'admin',
    });
    const res = makeRes();

    Manuscript.findById.mockResolvedValue({ _id: 'm-1', journalId: 'j-1' });

    await assignReviewers(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Invalid reviewerId') })
    );
  });
});
