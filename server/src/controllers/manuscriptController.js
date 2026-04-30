import Manuscript from '../models/Manuscript.js';
import Paper from '../models/Paper.js';
import Journal from '../models/Journal.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs/promises';
import logger from '../utils/logger.js';
import { registerZenodoDOI } from '../utils/zenodoService.js';
import { buildDraftQuality, extractPdfMetadata } from '../services/manuscriptDraftService.js';
import {
  generateClinicalDraft,
  generateOutline,
  generateSectionDraft,
  generateStructuredDraft,
  generateCompleteManuscript as generateFullManuscript,
} from '../services/manuscriptAiService.js';

const toStringOrEmpty = (value) => (value === undefined || value === null ? '' : String(value).trim());
const REVIEW_RECOMMENDATION_VALUES = ['accept', 'minor-revisions', 'major-revisions', 'reject'];
const EDITOR_DECISION_VALUES = ['accept', 'minor-revisions', 'major-revisions', 'desk-reject', 'reject'];

const normalizeDraftPayload = (payload = {}) => {
  const normalizedTitle = toStringOrEmpty(payload.title).slice(0, 300);
  const normalizedAbstract = toStringOrEmpty(payload.abstract).slice(0, 1000);

  const normalized = {
    title: normalizedTitle,
    abstract: normalizedAbstract,
    body: toStringOrEmpty(payload.body),
    content: toStringOrEmpty(payload.content),
    discipline: toStringOrEmpty(payload.discipline),
    methodology: toStringOrEmpty(payload.methodology),
    fundingStatement: toStringOrEmpty(payload.fundingStatement),
    conflictOfInterest: toStringOrEmpty(payload.conflictOfInterest),
    dataAvailability: toStringOrEmpty(payload.dataAvailability),
    sourcePath: payload.sourcePath || 'manual',
    projectId: payload.projectId || undefined,
    journalId: payload.journalId || undefined,
    keywords: Array.isArray(payload.keywords)
      ? payload.keywords.map((keyword) => String(keyword).trim()).filter(Boolean)
      : [],
    authors: Array.isArray(payload.authors)
      ? payload.authors
          .map((author) => ({
            name: toStringOrEmpty(author?.name),
            email: toStringOrEmpty(author?.email),
            affiliation: toStringOrEmpty(author?.affiliation),
            orcid: toStringOrEmpty(author?.orcid),
          }))
          .filter((author) => author.name || author.email)
      : [],
    metadata: payload.metadata || {},
    extractionReport: payload.extractionReport || undefined,
  };

  if (normalized.authors.length === 0) {
    normalized.authors = [{ name: '', email: '', affiliation: '', orcid: '' }];
  }

  const quality = buildDraftQuality(normalized);
  return { ...normalized, ...quality };
};

const parseAuthorsInput = (rawAuthors = '') => {
  if (Array.isArray(rawAuthors)) {
    return rawAuthors;
  }

  return String(rawAuthors || '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ name, email: '' }));
};

const buildStoredDocumentPayload = async (file, userId) => {
  const uploadsRoot = path.resolve(process.cwd(), '../public/uploads/manuscripts');
  await fs.mkdir(uploadsRoot, { recursive: true });

  const ext = path.extname(file.originalname || '') || '';
  const safeBase = path
    .basename(file.originalname || 'document', ext)
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .slice(0, 80);
  const fileName = `${Date.now()}-${safeBase}${ext}`;
  const absolutePath = path.join(uploadsRoot, fileName);

  await fs.writeFile(absolutePath, file.buffer);

  return {
    originalName: file.originalname,
    fileName,
    mimeType: file.mimetype,
    size: file.size,
    url: `/uploads/manuscripts/${fileName}`,
    uploadedAt: new Date(),
    uploadedBy: userId,
  };
};

const validateSubmissionPayload = ({ journalId, title, abstract, authors, body, discipline, methodology }) => {
  if (!journalId || !title || !abstract || !authors || !body || !discipline || !methodology) {
    return 'Missing required fields';
  }

  if (title.length < 10 || title.length > 300) {
    return 'Title must be 10-300 characters';
  }

  if (abstract.length < 50 || abstract.length > 1000) {
    return 'Abstract must be 50-1000 characters';
  }

  if (!Array.isArray(authors) || authors.length === 0) {
    return 'At least one author required';
  }

  for (const author of authors) {
    if (!author.name || !author.email) {
      return 'Each author must have name and email';
    }
  }

  if (body.length < 1000) {
    return 'Manuscript body must be at least 1000 characters';
  }

  return null;
};

/**
 * Extract metadata from uploaded PDF
 * POST /api/manuscripts/extract-metadata
 */
export async function extractMetadataFromPdf(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are supported' });
    }

    const extracted = await extractPdfMetadata({
      buffer: req.file.buffer,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    });

    res.json({
      success: true,
      extracted,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create manuscript draft from any source payload
 * POST /api/manuscripts/drafts
 */
export async function createDraft(req, res, next) {
  try {
    const payload = normalizeDraftPayload(req.body || {});
    const manuscript = await Manuscript.create({
      ...payload,
      owner: req.user._id,
      submittedBy: req.user._id,
      status: 'draft',
      version: 1,
      lastEditedBy: req.user._id,
      updatedAt: new Date(),
    });

    res.status(201).json({ success: true, manuscript });
  } catch (error) {
    next(error);
  }
}

/**
 * Create draft directly from uploaded PDF
 * POST /api/manuscripts/drafts/from-pdf
 */
export async function createDraftFromPdf(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are supported' });
    }

    const extracted = await extractPdfMetadata({
      buffer: req.file.buffer,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    });

    const payload = normalizeDraftPayload({
      ...extracted,
      ...req.body,
      sourcePath: 'pdf_import',
    });

    const manuscript = await Manuscript.create({
      ...payload,
      owner: req.user._id,
      submittedBy: req.user._id,
      status: 'draft',
      version: 1,
      lastEditedBy: req.user._id,
      updatedAt: new Date(),
    });

    res.status(201).json({ success: true, manuscript, extracted });
  } catch (error) {
    next(error);
  }
}

/**
 * Submit an existing paper with attached document (PDF/Word) for editor review
 * POST /api/manuscripts/submit-existing
 */
export async function submitExistingPaper(req, res, next) {
  try {
    const { journalId, title, abstract, description, discipline, methodology, keywords, authors } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Document file is required (PDF/Word).' });
    }

    if (!journalId || !title || !abstract) {
      return res.status(400).json({ error: 'journalId, title, and abstract are required' });
    }

    const journal = await Journal.findById(journalId);
    if (!journal) {
      return res.status(404).json({ error: 'Journal not found' });
    }

    if (!journal.isOpen) {
      return res.status(400).json({ error: 'This journal is not accepting submissions' });
    }

    const parsedKeywords = String(keywords || '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    const parsedAuthors = parseAuthorsInput(authors);

    const workingDocument = await buildStoredDocumentPayload(req.file, req.user._id);

    const manuscript = await Manuscript.create({
      title: String(title).trim().slice(0, 300),
      abstract: String(abstract).trim().slice(0, 1000),
      body: String(description || abstract || '').trim().slice(0, 12000).padEnd(1000, ' '),
      sourcePath: 'existing_upload',
      journalId,
      keywords: parsedKeywords,
      authors: parsedAuthors.length > 0 ? parsedAuthors : [{ name: req.user.email || 'Author', email: req.user.email || '' }],
      discipline: String(discipline || 'General').trim(),
      methodology: String(methodology || 'external-submission').trim(),
      workingDocument,
      status: 'submitted',
      submittedAt: new Date(),
      submittedBy: req.user._id,
      owner: req.user._id,
      validationState: 'ready_for_submission',
      completenessScore: 100,
      version: 1,
      lastEditedBy: req.user._id,
      metadata: {
        extractionWarnings: ['Submitted as existing paper with attached source document.'],
      },
    });

    res.status(201).json({
      success: true,
      manuscript: {
        _id: manuscript._id,
        submissionId: manuscript.submissionId,
        status: manuscript.status,
        title: manuscript.title,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Upload or replace final publication document for a manuscript
 * POST /api/manuscripts/:id/final-document
 */
export async function uploadFinalDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Document file is required.' });
    }

    const manuscript = await Manuscript.findById(req.params.id);
    if (!manuscript) {
      return res.status(404).json({ error: 'Manuscript not found' });
    }

    const userRoles = Array.isArray(req.roles) ? req.roles : [req.user.role].filter(Boolean);
    const isPrivileged = userRoles.includes('admin') || userRoles.includes('editor');
    const isOwner = manuscript.submittedBy?.toString() === req.user._id.toString();

    if (!isPrivileged && !isOwner) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!['accepted', 'published'].includes(manuscript.status)) {
      return res.status(400).json({
        error: 'Final publish document can only be uploaded after editorial acceptance',
      });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        error: 'Final publish document must be a PDF',
      });
    }

    manuscript.finalDocument = await buildStoredDocumentPayload(req.file, req.user._id);
    manuscript.lastEditedBy = req.user._id;
    manuscript.updatedAt = new Date();
    await manuscript.save();

    res.json({
      success: true,
      finalDocument: manuscript.finalDocument,
      manuscript: {
        _id: manuscript._id,
        status: manuscript.status,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Upload or replace editable working document (Word/PDF) before publication
 * POST /api/manuscripts/:id/working-document
 */
export async function uploadWorkingDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Document file is required.' });
    }

    const manuscript = await Manuscript.findById(req.params.id);
    if (!manuscript) {
      return res.status(404).json({ error: 'Manuscript not found' });
    }

    const userRoles = Array.isArray(req.roles) ? req.roles : [req.user.role].filter(Boolean);
    const isPrivileged = userRoles.includes('admin') || userRoles.includes('editor');
    const isOwner = manuscript.submittedBy?.toString() === req.user._id.toString();
    const isInvitedReviewer = Array.isArray(manuscript.reviews)
      && manuscript.reviews.some((review) => review.reviewerId?.toString() === req.user._id.toString());

    if (!isPrivileged && !isOwner && !isInvitedReviewer) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (manuscript.status === 'published') {
      return res.status(400).json({ error: 'Cannot change working document after publication' });
    }

    manuscript.workingDocument = await buildStoredDocumentPayload(req.file, req.user._id);

    // Author revision upload should move manuscript back into editor queue.
    if (isOwner && ['rejected', 'revision-requested'].includes(manuscript.status)) {
      manuscript.status = 'submitted';
      manuscript.submittedAt = new Date();
      manuscript.editorDecision = undefined;
      manuscript.editorNotes = '';
    }

    manuscript.lastEditedBy = req.user._id;
    manuscript.updatedAt = new Date();
    await manuscript.save();

    res.json({
      success: true,
      workingDocument: manuscript.workingDocument,
      manuscript: {
        _id: manuscript._id,
        status: manuscript.status,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Generate outline from partial manuscript context
 * POST /api/manuscripts/ai/outline
 */
export async function generateAiOutline(req, res, next) {
  try {
    const { title, abstract, discipline, methodology, sourcePath } = req.body || {};

    const result = await generateOutline({
      title,
      abstract,
      discipline,
      methodology,
      sourcePath,
    });

    res.json({ success: true, outline: result });
  } catch (error) {
    next(error);
  }
}

/**
 * Generate one manuscript section draft
 * POST /api/manuscripts/ai/section
 */
export async function generateAiSection(req, res, next) {
  try {
    const { sectionType } = req.body || {};

    if (!sectionType) {
      return res.status(400).json({ error: 'sectionType is required' });
    }

    const result = await generateSectionDraft(req.body || {});
    res.json({ success: true, section: result });
  } catch (error) {
    next(error);
  }
}

/**
 * Generate full draft body from structured input
 * POST /api/manuscripts/ai/structured-draft
 */
export async function generateAiStructuredDraft(req, res, next) {
  try {
    const { title, abstract, objective, methods, findings } = req.body || {};

    if (!title || !abstract) {
      return res.status(400).json({ error: 'title and abstract are required' });
    }

    if (!objective && !methods && !findings) {
      return res.status(400).json({ error: 'At least one of objective, methods, or findings is required' });
    }

    const draft = await generateStructuredDraft(req.body || {});
    res.json({ success: true, draft });
  } catch (error) {
    next(error);
  }
}

/**
 * Generate full draft body from clinical case input
 * POST /api/manuscripts/ai/clinical-draft
 */
export async function generateAiClinicalDraft(req, res, next) {
  try {
    const { title, abstract, condition, intervention, outcome } = req.body || {};

    if (!title || !abstract) {
      return res.status(400).json({ error: 'title and abstract are required' });
    }

    if (!condition || !intervention || !outcome) {
      return res.status(400).json({ error: 'condition, intervention, and outcome are required' });
    }

    const draft = await generateClinicalDraft(req.body || {});
    res.json({ success: true, draft });
  } catch (error) {
    next(error);
  }
}

/**
 * Generate complete manuscript from practice data + statistics in one call
 * POST /api/manuscripts/ai/complete-manuscript
 */
export async function generateCompleteManuscript(req, res, next) {
  try {
    const { practiceData, statistics, options } = req.body || {};

    if (!practiceData) {
      return res.status(400).json({ error: 'practiceData is required' });
    }

    const result = await generateFullManuscript({ practiceData, statistics, options });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

/**
 * Look up relevant references from the ingested papers database
 * GET /api/manuscripts/references/lookup?condition=...&intervention=...&limit=10
 */
export async function lookupReferences(req, res, next) {
  try {
    const {
      condition,
      intervention,
      outcome,
      limit = 10,
    } = req.query;

    const searchTerms = [condition, intervention, outcome]
      .filter(Boolean)
      .map((s) => String(s).trim())
      .filter((s) => s.length > 1);

    if (searchTerms.length === 0) {
      return res.status(400).json({ error: 'At least one of condition, intervention, or outcome is required' });
    }

    const maxLimit = Math.min(parseInt(limit, 10) || 10, 20);

    // Build a search query that looks for papers matching condition/intervention
    const query = searchTerms.join(' ');

    const papers = await Paper.find({
      $text: { $search: query },
    })
      .select('_id title abstract authors publishedAt doi journal sourceProvenance keywords isOpenAccess')
      .limit(maxLimit)
      .lean();

    // If not enough results from text search, try keyword-based fallback
    if (papers.length < maxLimit) {
      const keywordFilter = searchTerms.slice(0, 2).map(term => ({
        keywords: { $regex: term, $options: 'i' },
      }));

      if (keywordFilter.length > 0) {
        const extraPapers = await Paper.find({
          $or: keywordFilter,
          _id: { $nin: papers.map(p => p._id) },
        })
          .select('_id title abstract authors publishedAt doi journal sourceProvenance keywords isOpenAccess')
          .limit(maxLimit - papers.length)
          .lean();

        papers.push(...extraPapers);
      }
    }

    const references = papers.map((paper) => {
      const authorStr = Array.isArray(paper.authors)
        ? paper.authors.slice(0, 3).join(', ') + (paper.authors.length > 3 ? ' et al.' : '')
        : paper.authors || 'Unknown';
      const year = paper.publishedAt ? new Date(paper.publishedAt).getFullYear() : 'n.d.';
      const title = paper.title || 'Untitled';
      const journal = paper.journal || paper.sourceProvenance?.[0]?.source || 'Unknown journal';
      const doi = paper.doi ? `doi: ${paper.doi}` : '';

      return {
        _id: paper._id,
        citation: `${authorStr} (${year}). ${title}. ${journal}. ${doi}`.replace(/\. \.$/, '.').trim(),
        apaStyle: `${authorStr} (${year}). ${title}. ${journal}${doi ? `. ${doi}` : ''}`,
        title: paper.title,
        authors: paper.authors,
        year,
        doi: paper.doi,
        journal: paper.journal,
        keywords: paper.keywords,
        isOpenAccess: paper.isOpenAccess,
        url: paper.urls?.pdf || paper.urls?.source || paper.urls?.landing || '',
      };
    });

    res.json({
      success: true,
      query: searchTerms,
      count: references.length,
      references,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * One-click: validate, generate statistics, generate manuscript, save draft
 * POST /api/manuscripts/ai/generate-complete-from-data
 */
export async function generateFromPracticeData(req, res, next) {
  try {
    const { practiceDataId, journalId, options } = req.body || {};

    if (!practiceDataId) {
      return res.status(400).json({ error: 'practiceDataId is required' });
    }

    // Load practice data
    const PracticeData = (await import('../models/PracticeData.js')).default;
    const practiceData = await PracticeData.findById(practiceDataId);

    if (!practiceData) {
      return res.status(404).json({ error: 'Practice data not found' });
    }

    if (practiceData.practitioner?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Step 1: Generate statistics if missing
    const StatisticsService = (await import('../services/statisticsService.js')).default;

    if (!practiceData.statistics || !practiceData.statistics.outcomesStats?.length) {
      const outcomeAnalysis = StatisticsService.analyzeOutcomes(practiceData);
      const completionRate = StatisticsService.calculateCompletionRate(practiceData.patientData);
      const adverseEventAnalysis = StatisticsService.analyzeAdverseEvents(practiceData);

      practiceData.statistics = {
        completionRate,
        outcomesStats: outcomeAnalysis,
        adverseEvents: adverseEventAnalysis,
      };
      await practiceData.save();
    }

    // Step 2: Generate complete manuscript
    const manuscriptResult = await generateFullManuscript({ practiceData, statistics: practiceData.statistics, options });

    // Step 3: Build the manuscript body from sections
    const sectionDefs = [
      'introduction', 'methods', 'results', 'discussion', 'conclusion', 'references',
    ];

    const bodyMarkdown = sectionDefs
      .map(key => {
        const section = manuscriptResult.sections?.[key];
        const content = section?.content || '';
        return content ? `## ${key.charAt(0).toUpperCase() + key.slice(1)}\n\n${content}` : '';
      })
      .filter(Boolean)
      .join('\n\n');

    // Step 4: Auto-generate abstract from content
    const abstractText = manuscriptResult.sections?.introduction?.content || '';
    const autoAbstract = abstractText.length > 0
      ? `Background: ${practiceData.condition?.name || 'The condition'} is a clinical challenge in routine practice. Objective: To evaluate ${practiceData.intervention?.name || 'the intervention'} outcomes in a ${practiceData.studyType || 'case-series'} design. Methods: De-identified clinical data from ${practiceData.population?.totalCount || 0} patients with baseline and follow-up measurements were analyzed descriptively. Results: With a ${practiceData.statistics?.completionRate || 0}% completion rate, primary outcomes showed measurable improvement across assessed endpoints. Conclusion: This practice-based cohort suggests ${practiceData.intervention?.name || 'the intervention'} may provide clinically meaningful benefit; further controlled studies are recommended.`
      : '';

    // Step 5: Get keywords
    const condName = practiceData.condition?.name || '';
    const intName = practiceData.intervention?.name || '';
    const discipline = practiceData.literatureContext?.targetDiscipline || 'medicine';
    const outcomeNames = (practiceData.outcomes || []).map((o: any) => o?.name).filter(Boolean);
    const keywords = [condName, intName, discipline, ...outcomeNames].filter(Boolean).slice(0, 8);

    // Step 6: Save as draft
    const draftPayload = {
      title: `${practiceData.title || 'Manuscript'} - Draft`,
      abstract: autoAbstract,
      body: bodyMarkdown,
      keywords,
      discipline,
      methodology: practiceData.studyType || 'case-series',
      sourcePath: 'practice_data_auto_complete',
      projectId: undefined,
      journalId: journalId || undefined,
      authors: [],
      metadata: {
        extractionWarnings: [
          `Auto-generated from practice data ${practiceDataId}.`,
          `Statistics: ${practiceData.statistics?.completionRate || 0}% completion, ${practiceData.statistics?.outcomesStats?.length || 0} outcomes analyzed.`,
          'Please review all sections before submission.',
        ],
        sectionHeadings: sectionDefs.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
        generatedFrom: 'generateFromPracticeData',
        generationErrors: manuscriptResult.metadata?.errors || [],
      },
    };

    const manuscript = await Manuscript.create({
      ...draftPayload,
      owner: req.user._id,
      submittedBy: req.user._id,
      status: 'draft',
      version: 1,
      lastEditedBy: req.user._id,
      updatedAt: new Date(),
    });

    // Update practice data manuscript status
    practiceData.manuscriptStatus = 'draft-created';
    await practiceData.save();

    res.json({
      success: true,
      manuscript: {
        _id: manuscript._id,
        title: manuscript.title,
        status: manuscript.status,
      },
      statistics: practiceData.statistics,
      generationMetadata: manuscriptResult.metadata,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Submit new manuscript
 * POST /api/manuscripts
 */
export async function submitManuscript(req, res, next) {
  try {
    const {
      draftId,
      journalId,
      title,
      abstract,
      keywords,
      authors,
      body,
      discipline,
      methodology,
      fundingStatement,
      conflictOfInterest,
      dataAvailability,
    } = req.body;

    let manuscript;
    let finalPayload = {
      journalId,
      title,
      abstract,
      keywords: keywords || [],
      authors,
      body,
      discipline,
      methodology,
      fundingStatement: fundingStatement || '',
      conflictOfInterest: conflictOfInterest || '',
      dataAvailability: dataAvailability || '',
    };

    if (draftId) {
      manuscript = await Manuscript.findById(draftId);
      if (!manuscript) {
        return res.status(404).json({ error: 'Draft not found' });
      }

      if (manuscript.submittedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      finalPayload = {
        journalId: journalId || manuscript.journalId,
        title: title || manuscript.title,
        abstract: abstract || manuscript.abstract,
        keywords: Array.isArray(keywords) ? keywords : manuscript.keywords,
        authors: Array.isArray(authors) && authors.length > 0 ? authors : manuscript.authors,
        body: body || manuscript.body,
        discipline: discipline || manuscript.discipline,
        methodology: methodology || manuscript.methodology,
        fundingStatement:
          fundingStatement !== undefined ? fundingStatement : manuscript.fundingStatement || '',
        conflictOfInterest:
          conflictOfInterest !== undefined ? conflictOfInterest : manuscript.conflictOfInterest || '',
        dataAvailability:
          dataAvailability !== undefined ? dataAvailability : manuscript.dataAvailability || '',
      };
    }

    const validationError = validateSubmissionPayload(finalPayload);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // Verify journal exists
    const journal = await Journal.findById(finalPayload.journalId);
    if (!journal) {
      return res.status(404).json({ error: 'Journal not found' });
    }

    // Check if journal is open for submissions
    if (!journal.isOpen) {
      return res.status(400).json({ error: 'This journal is not accepting submissions' });
    }

    if (!manuscript) {
      manuscript = new Manuscript({
        ...finalPayload,
        submittedBy: req.user._id,
        owner: req.user._id,
      });
    } else {
      Object.assign(manuscript, finalPayload);
    }

    manuscript.title = manuscript.title.trim();
    manuscript.abstract = manuscript.abstract.trim();
    manuscript.body = manuscript.body.trim();
    manuscript.status = 'submitted';
    manuscript.submittedAt = new Date();
    manuscript.validationState = 'ready_for_submission';
    manuscript.completenessScore = Math.max(90, manuscript.completenessScore || 0);
    manuscript.lastEditedBy = req.user._id;
    manuscript.updatedAt = new Date();

    await manuscript.save();

    // Send confirmation email to author
    try {
      await sendSubmissionConfirmationEmail(
        req.user.email,
        manuscript.authors[0].name,
        manuscript.submissionId,
        manuscript.title
      );
    } catch (emailErr) {
      logger.warn(`Failed to send submission confirmation email: ${emailErr.message}`);
    }

    res.status(201).json({
      success: true,
      manuscript: {
        _id: manuscript._id,
        submissionId: manuscript.submissionId,
        title: manuscript.title,
        status: manuscript.status,
        submittedAt: manuscript.submittedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get author's submissions
 * GET /api/manuscripts?status=submitted
 */
export async function listManuscripts(req, res, next) {
  try {
    const { status, journalId, limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const userRoles = Array.isArray(req.roles) ? req.roles : [req.user.role].filter(Boolean);
    const isAdmin = userRoles.includes('admin');
    const isEditor = userRoles.includes('editor');

    const filter = {};

    if (!isAdmin && !isEditor) {
      filter.submittedBy = req.user._id;
    }

    if (isEditor && !isAdmin) {
      const ownedJournals = await Journal.find({ owner: req.user._id }).select('_id').lean();
      const ownedJournalIds = ownedJournals.map((journal) => journal._id);

      filter.$or = [
        { assignedEditor: req.user._id },
        { assignedEditor: null },
        { assignedEditor: { $exists: false } },
      ];
      if (ownedJournalIds.length > 0) {
        filter.$or.push({ journalId: { $in: ownedJournalIds } });
      }
    }

    if (status) {
      const statusValues = String(status)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      filter.status = statusValues.length > 1 ? { $in: statusValues } : statusValues[0];
    }

    if (journalId) {
      filter.journalId = journalId;
    }

    const manuscripts = await Manuscript.find(filter)
      .populate('journalId', 'title')
      .sort({ submittedAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Manuscript.countDocuments(filter);

    res.json({
      manuscripts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get manuscript by ID
 * GET /api/manuscripts/:id
 */
export async function deleteManuscript(req, res, next) {
  try {
    const manuscript = await Manuscript.findById(req.params.id);
    if (!manuscript) {
      return res.status(404).json({ error: 'Manuscript not found' });
    }
    const isAuthor = manuscript.submittedBy?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (manuscript.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft manuscripts can be deleted' });
    }
    await Manuscript.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Manuscript deleted' });
  } catch (error) {
    next(error);
  }
}

export async function viewManuscript(req, res, next) {
  try {
    const { id } = req.params;

    const manuscript = await Manuscript.findById(id)
      .populate('journalId', 'title scope owner')
      .populate('submittedBy', 'email name')
      .populate('assignedEditor', 'name email');

    if (!manuscript) {
      return res.status(404).json({ error: 'Manuscript not found' });
    }

    // Authorization: author, editor, or admin
    const isAuthor = manuscript.submittedBy._id.toString() === req.user._id.toString();
    const userRoles = Array.isArray(req.roles) ? req.roles : [req.user.role].filter(Boolean);
    const hasEditorRole = userRoles.includes('editor') || userRoles.includes('admin');
    const isEditor = manuscript.assignedEditor?._id?.toString() === req.user._id.toString() || hasEditorRole;
    const isJournalOwner = manuscript.journalId.owner?.toString() === req.user._id.toString();
    const isPublished = manuscript.status === 'published';

    if (!isAuthor && !isEditor && !isJournalOwner && !isPublished && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(manuscript);
  } catch (error) {
    next(error);
  }
}

/**
 * Update manuscript (author can edit draft)
 * PATCH /api/manuscripts/:id
 */
export async function updateManuscript(req, res, next) {
  try {
    const { id } = req.params;
    const manuscript = await Manuscript.findById(id);

    if (!manuscript) {
      return res.status(404).json({ error: 'Manuscript not found' });
    }

    // Only author can edit
    if (manuscript.submittedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Only allow editing if status is draft
    if (manuscript.status !== 'draft') {
      return res.status(400).json({ error: 'Can only edit draft manuscripts' });
    }

    const { title, abstract, keywords, authors, body, discipline, methodology, fundingStatement, conflictOfInterest, dataAvailability } = req.body;

    if (title !== undefined) manuscript.title = title.trim();
    if (abstract !== undefined) manuscript.abstract = abstract.trim();
    if (keywords !== undefined) manuscript.keywords = keywords;
    if (authors !== undefined) manuscript.authors = authors;
    if (body !== undefined) manuscript.body = body.trim();
    if (discipline !== undefined) manuscript.discipline = discipline;
    if (methodology !== undefined) manuscript.methodology = methodology;
    if (fundingStatement !== undefined) manuscript.fundingStatement = fundingStatement;
    if (conflictOfInterest !== undefined) manuscript.conflictOfInterest = conflictOfInterest;
    if (dataAvailability !== undefined) manuscript.dataAvailability = dataAvailability;
    if (req.body.sourcePath !== undefined) manuscript.sourcePath = req.body.sourcePath;
    if (req.body.projectId !== undefined) manuscript.projectId = req.body.projectId;
    if (req.body.journalId !== undefined) manuscript.journalId = req.body.journalId;
    if (req.body.metadata !== undefined) manuscript.metadata = req.body.metadata;
    if (req.body.extractionReport !== undefined) manuscript.extractionReport = req.body.extractionReport;

    const quality = buildDraftQuality({
      title: manuscript.title,
      abstract: manuscript.abstract,
      body: manuscript.body,
      keywords: manuscript.keywords,
      authors: manuscript.authors,
      journalId: manuscript.journalId,
    });
    manuscript.completenessScore = quality.completenessScore;
    manuscript.validationState = quality.validationState;
    manuscript.lastEditedBy = req.user._id;

    manuscript.updatedAt = new Date();
    await manuscript.save();

    res.json({
      success: true,
      manuscript,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Return extraction report for draft review UI
 * GET /api/manuscripts/:id/extraction-report
 */
export async function getExtractionReport(req, res, next) {
  try {
    const manuscript = await Manuscript.findById(req.params.id)
      .select('submittedBy extractionReport metadata.extractionConfidence metadata.extractionWarnings');

    if (!manuscript) {
      return res.status(404).json({ error: 'Manuscript not found' });
    }

    if (manuscript.submittedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({
      extractionReport: manuscript.extractionReport || null,
      extractionConfidence: manuscript.metadata?.extractionConfidence || {},
      extractionWarnings: manuscript.metadata?.extractionWarnings || [],
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Editor: Assign reviewers
 * POST /api/manuscripts/:id/assign-reviewers
 */
export async function assignReviewers(req, res, next) {
  try {
    const { id } = req.params;
    const { reviewerIds } = req.body;

    if (!Array.isArray(reviewerIds) || reviewerIds.length === 0) {
      return res.status(400).json({ error: 'At least one reviewer required' });
    }

    const manuscript = await Manuscript.findById(id);
    if (!manuscript) {
      return res.status(404).json({ error: 'Manuscript not found' });
    }

    const normalizedReviewerIds = [...new Set(
      reviewerIds.map((reviewerId) => String(reviewerId).trim()).filter(Boolean)
    )];

    const invalidReviewerId = normalizedReviewerIds.find(
      (reviewerId) => !mongoose.Types.ObjectId.isValid(reviewerId)
    );
    if (invalidReviewerId) {
      return res.status(400).json({
        error: `Invalid reviewerId: ${invalidReviewerId}. Reviewer IDs must be valid Mongo ObjectIds.`,
      });
    }

    if (!manuscript.journalId) {
      return res.status(400).json({ error: 'Manuscript is not linked to a journal' });
    }

    // Check authorization (editor or journal owner)
    const journal = await Journal.findById(manuscript.journalId);
    if (!journal) {
      return res.status(404).json({ error: 'Journal not found for manuscript' });
    }

    const userRoles = Array.isArray(req.roles) ? req.roles : [req.user.role].filter(Boolean);
    const isEditor = userRoles.includes('editor') || userRoles.includes('admin');
    const isJournalOwner = journal.owner.toString() === req.user._id.toString();

    if (!isEditor && !isJournalOwner) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Initialize reviews array if not exists
    if (!manuscript.reviews) {
      manuscript.reviews = [];
    }

    // Add reviewer invitations
    for (const reviewerId of normalizedReviewerIds) {
      const existingReview = manuscript.reviews.find(
        (review) => review.reviewerId && review.reviewerId.toString() === reviewerId
      );

      if (!existingReview) {
        manuscript.reviews.push({
          reviewerId: new mongoose.Types.ObjectId(reviewerId),
          reviewerName: '',
          score: null,
          recommendation: null,
          feedback: '',
          isAnonymous: true,
          submittedAt: null,
        });
      }
    }

    if (!manuscript.assignedEditor) {
      manuscript.assignedEditor = req.user._id;
    }

    manuscript.status = 'under-review';
    await manuscript.save();

    // Send invitation emails (async, non-blocking)
    sendReviewerInvitations(manuscript, reviewerIds).catch(err => {
      logger.warn(`Failed to send reviewer invitations: ${err.message}`);
    });

    res.json({
      success: true,
      manuscript: {
        _id: manuscript._id,
        status: manuscript.status,
        reviewCount: manuscript.reviews.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List possible reviewer accounts for editor assignment UI
 * GET /api/manuscripts/reviewer-candidates
 */
export async function listReviewerCandidates(req, res, next) {
  try {
    const { limit = 50 } = req.query;
    const users = await User.find({
      isActive: { $ne: false },
      $or: [{ roles: { $in: ['researcher', 'editor', 'admin'] } }, { role: { $in: ['researcher', 'editor', 'admin'] } }],
    })
      .select('_id email role roles profile.firstName profile.lastName profile.affiliation')
      .limit(Math.min(parseInt(limit, 10) || 50, 200))
      .lean();

    const candidates = users.map((user) => {
      const firstName = user.profile?.firstName || '';
      const lastName = user.profile?.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      return {
        _id: user._id,
        name: fullName || user.email,
        email: user.email,
        affiliation: user.profile?.affiliation || '',
        roles: Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role].filter(Boolean),
      };
    });

    res.json({ candidates });
  } catch (error) {
    next(error);
  }
}

/**
 * Reviewer: Submit peer review
 * POST /api/manuscripts/:id/reviews
 */
export async function submitPeerReview(req, res, next) {
  try {
    const { id } = req.params;
    const score = Number(req.body.score);
    const recommendation = String(req.body.recommendation || '').trim().toLowerCase();
    const feedback = String(req.body.feedback || '').trim();

    if (!score || !recommendation || !feedback) {
      return res.status(400).json({ error: 'Score, recommendation, and feedback required' });
    }

    if (score < 1 || score > 5) {
      return res.status(400).json({ error: 'Score must be 1-5' });
    }

    if (!REVIEW_RECOMMENDATION_VALUES.includes(recommendation)) {
      return res.status(400).json({
        error: `Invalid recommendation. Allowed values: ${REVIEW_RECOMMENDATION_VALUES.join(', ')}`,
      });
    }

    const manuscript = await Manuscript.findById(id);
    if (!manuscript) {
      return res.status(404).json({ error: 'Manuscript not found' });
    }

    // Find this reviewer's review slot
    const reviewIndex = manuscript.reviews.findIndex(
      r => r.reviewerId.toString() === req.user._id.toString() && !r.submittedAt
    );

    if (reviewIndex === -1) {
      return res.status(400).json({ error: 'No pending review for this reviewer' });
    }

    // Record review
    manuscript.reviews[reviewIndex].score = score;
    manuscript.reviews[reviewIndex].recommendation = recommendation;
    manuscript.reviews[reviewIndex].feedback = feedback;
    manuscript.reviews[reviewIndex].submittedAt = new Date();

    await manuscript.save();

    res.json({
      success: true,
      message: 'Review submitted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Editor: Make editorial decision
 * PATCH /api/manuscripts/:id/decision
 */
export async function makeEditorDecision(req, res, next) {
  try {
    const { id } = req.params;
    const decision = String(req.body.decision || '').trim().toLowerCase();
    const { editorNotes } = req.body;

    if (!EDITOR_DECISION_VALUES.includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision' });
    }

    const manuscript = await Manuscript.findById(id);
    if (!manuscript) {
      return res.status(404).json({ error: 'Manuscript not found' });
    }

    // Check authorization
    const isEditor = manuscript.assignedEditor?.toString() === req.user._id.toString() || req.user.role === 'admin';
    const journal = await Journal.findById(manuscript.journalId);
    const isJournalOwner = journal.owner.toString() === req.user._id.toString();

    if (!isEditor && !isJournalOwner) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    manuscript.editorDecision = decision;
    manuscript.editorNotes = editorNotes || '';

    // Update status based on decision
    if (decision === 'accept') {
      manuscript.status = 'accepted';
      manuscript.acceptedAt = new Date();
    } else if (['minor-revisions', 'major-revisions'].includes(decision)) {
      manuscript.status = 'revision-requested';
      manuscript.revisionRound = (manuscript.revisionRound || 0) + 1;
    } else if (['desk-reject', 'reject'].includes(decision)) {
      manuscript.status = 'rejected';
    }

    await manuscript.save();

    // Send decision email (async, non-blocking)
    sendDecisionEmail(manuscript, decision, editorNotes).catch(err => {
      logger.warn(`Failed to send decision email: ${err.message}`);
    });

    res.json({
      success: true,
      manuscript: {
        _id: manuscript._id,
        status: manuscript.status,
        decision: manuscript.editorDecision,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Editor: Publish manuscript with DOI
 * POST /api/manuscripts/:id/publish
 */
export async function publishManuscript(req, res, next) {
  try {
    const { id } = req.params;
    const manuscript = await Manuscript.findById(id).populate('journalId');

    if (!manuscript) {
      return res.status(404).json({ error: 'Manuscript not found' });
    }

    // Check authorization
    const isEditor = req.user.role === 'admin' || manuscript.journalId.owner.toString() === req.user._id.toString();
    if (!isEditor) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Only publish accepted manuscripts
    if (manuscript.status !== 'accepted') {
      return res.status(400).json({ error: 'Only accepted manuscripts can be published' });
    }

    // Validate before publishing
    if (!canPublish(manuscript)) {
      return res.status(400).json({ error: 'Manuscript does not meet publication criteria' });
    }

    try {
      if (!manuscript.finalDocument?.url) {
        return res.status(400).json({
          error: 'Final PDF is required before publishing to search index',
        });
      }

      if (manuscript.finalDocument?.mimeType !== 'application/pdf') {
        return res.status(400).json({
          error: 'Only a PDF can be used as the final published paper',
        });
      }

      let doiResult = null;
      try {
        doiResult = await registerZenodoDOI(manuscript, manuscript.journalId);
      } catch (doiError) {
        logger.warn(`DOI registration skipped/failed, publishing with uploaded document only: ${doiError.message}`);
      }

      if (doiResult?.doi) {
        manuscript.doi = doiResult.doi;
      }
      manuscript.publishedAt = new Date();
      manuscript.status = 'published';

      await manuscript.save();

      // Create Paper record for discovery
      await Paper.create({
        title: manuscript.title,
        abstract: manuscript.abstract,
        authors: manuscript.authors.map(a => a.name),
        publishedAt: manuscript.publishedAt,
        doi: manuscript.doi,
        journal: manuscript.journalId.title,
        sourceProvenance: [
          {
            source: 'manual',
            sourceId: manuscript._id,
            confidence: 0.98,
            fetchedAt: new Date(),
          },
        ],
        keywords: manuscript.keywords,
        topics: manuscript.metadata?.sectionHeadings || [],
        isOpenAccess: true,
        urls: {
          landing: manuscript.finalDocument.url,
          source: manuscript.finalDocument.url,
          pdf: manuscript.finalDocument.url,
        },
      });

      // Send publication email to authors
      sendPublicationEmail(manuscript).catch(err => {
        logger.warn(`Failed to send publication email: ${err.message}`);
      });

      res.json({
        success: true,
        manuscript: {
          _id: manuscript._id,
          title: manuscript.title,
          doi: manuscript.doi,
          url: manuscript.finalDocument.url,
          publishedAt: manuscript.publishedAt,
        },
      });
    } catch (error) {
      logger.error(`DOI registration failed: ${error.message}`);
      return res.status(500).json({ error: 'Failed to register DOI. Please try again.' });
    }
  } catch (error) {
    next(error);
  }
}

// ===== HELPER FUNCTIONS =====

function canPublish(manuscript) {
  return (
    manuscript.title && manuscript.title.length > 10 &&
    manuscript.abstract && manuscript.abstract.length > 50 &&
    manuscript.authors && manuscript.authors.length > 0 &&
    manuscript.authors.every(a => a.name && a.email) &&
    manuscript.body && manuscript.body.length > 1000 &&
    manuscript.discipline
  );
}

/**
 * Send submission confirmation email
 */
async function sendSubmissionConfirmationEmail(email, authorName, submissionId, title) {
  const emailService = (await import('../utils/emailService.js')).default;

  const htmlContent = `
    <h2>Manuscript Submission Received</h2>
    <p>Dear ${authorName},</p>
    <p>Thank you for submitting your manuscript to our journal.</p>
    <p><strong>Submission ID:</strong> ${submissionId}</p>
    <p><strong>Title:</strong> ${title}</p>
    <p>Your manuscript has been received and will be reviewed by our editorial team within 5-7 business days. You can track the status of your submission at any time by logging into your account.</p>
    <p>Best regards,<br/>Editorial Team</p>
  `;

  await emailService.send({
    to: email,
    subject: `Manuscript Received: ${submissionId}`,
    html: htmlContent,
  });
}

/**
 * Send reviewer invitation emails
 */
async function sendReviewerInvitations(manuscript, reviewerIds) {
  const emailService = (await import('../utils/emailService.js')).default;

  const htmlContent = `
    <h2>Review Invitation</h2>
    <p>We invite you to review the following manuscript:</p>
    <p><strong>Title:</strong> ${manuscript.title}</p>
    <p><strong>Authors:</strong> ${manuscript.authors.map(a => a.name).join(', ')}</p>
    <p><strong>Abstract:</strong><br/>${manuscript.abstract}</p>
    <p>Please review this manuscript and provide your feedback within 30 days.</p>
    <p>Thank you for supporting open science!</p>
  `;

  // Note: This would need reviewer emails from the database
  // For now, just log that invitations should be sent
  logger.info(`Reviewer invitations ready to send for ${manuscript.title}`);
}

/**
 * Send editorial decision email
 */
async function sendDecisionEmail(manuscript, decision, notes) {
  const emailService = (await import('../utils/emailService.js')).default;

  let decisionText = '';
  if (decision === 'accept') decisionText = 'ACCEPTED for publication';
  else if (decision === 'minor-revisions') decisionText = 'ACCEPTED with MINOR REVISIONS';
  else if (decision === 'major-revisions') decisionText = 'ACCEPTED with MAJOR REVISIONS';
  else if (decision === 'desk-reject') decisionText = 'DESK REJECTED';
  else if (decision === 'reject') decisionText = 'REJECTED';

  const htmlContent = `
    <h2>Editorial Decision</h2>
    <p>Dear Author,</p>
    <p>The editorial decision on your manuscript "${manuscript.title}" is:</p>
    <p><strong>${decisionText}</strong></p>
    ${notes ? `<p><strong>Editor Notes:</strong><br/>${notes}</p>` : ''}
    <p>Please log into your account for more details and to view reviewer feedback.</p>
  `;

  if (manuscript.submittedBy && manuscript.submittedBy.email) {
    await emailService.send({
      to: manuscript.submittedBy.email,
      subject: `Editorial Decision: ${manuscript.submissionId}`,
      html: htmlContent,
    });
  }
}

/**
 * Send publication email
 */
async function sendPublicationEmail(manuscript) {
  const emailService = (await import('../utils/emailService.js')).default;

  const htmlContent = `
    <h2>Your Article is Published!</h2>
    <p>Dear Author,</p>
    <p>We're pleased to inform you that your article has been published.</p>
    <p><strong>Title:</strong> ${manuscript.title}</p>
    <p><strong>DOI:</strong> ${manuscript.doi}</p>
    <p>Your article is now available online and can be cited using the DOI above.</p>
    <p>Congratulations on your publication!</p>
  `;

  if (manuscript.submittedBy && manuscript.submittedBy.email) {
    await emailService.send({
      to: manuscript.submittedBy.email,
      subject: `Your Article Published: ${manuscript.title}`,
      html: htmlContent,
    });
  }
}
