import express from 'express';
import multer from 'multer';
import {
  createDraft,
  generateCompleteManuscript,
  createDraftFromPdf,
  extractMetadataFromPdf,
  generateAiClinicalDraft,
  generateAiOutline,
  generateAiSection,
  generateAiStructuredDraft,
  getExtractionReport,
  listReviewerCandidates,
  lookupReferences,
  generateFromPracticeData,
  submitExistingPaper,
  submitManuscript,
  listManuscripts,
  viewManuscript,
  updateManuscript,
  assignReviewers,
  submitPeerReview,
  makeEditorDecision,
  publishManuscript,
  uploadFinalDocument,
  uploadWorkingDocument,
} from '../controllers/manuscriptController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowed.includes(file.mimetype)) {
      const error = new Error('Only PDF, DOC, and DOCX files are supported');
      error.status = 400;
      return cb(error);
    }
    cb(null, true);
  },
});

// Draft creation routes
router.post('/extract-metadata', authMiddleware, upload.single('pdf'), extractMetadataFromPdf);
router.post('/drafts', authMiddleware, createDraft);
router.post('/drafts/from-pdf', authMiddleware, upload.single('pdf'), createDraftFromPdf);
router.post('/submit-existing', authMiddleware, uploadDocument.single('document'), submitExistingPaper);
router.post('/ai/outline', authMiddleware, generateAiOutline);
router.post('/ai/section', authMiddleware, generateAiSection);
router.post('/ai/structured-draft', authMiddleware, generateAiStructuredDraft);
router.post('/ai/clinical-draft', authMiddleware, generateAiClinicalDraft);
router.post('/ai/complete-manuscript', authMiddleware, generateCompleteManuscript);
router.get('/reviewer-candidates', authMiddleware, requireRole(['editor', 'admin']), listReviewerCandidates);

// Reference lookup from ingested papers
router.get('/references/lookup', authMiddleware, lookupReferences);

// One-click: validate → stats → manuscript → draft
router.post('/ai/generate-from-practice-data', authMiddleware, generateFromPracticeData);

// Author routes
router.post('/', authMiddleware, submitManuscript);
router.get('/', authMiddleware, listManuscripts);
router.get('/:id', authMiddleware, viewManuscript);
router.patch('/:id', authMiddleware, updateManuscript);
router.get('/:id/extraction-report', authMiddleware, getExtractionReport);
router.post('/:id/final-document', authMiddleware, uploadDocument.single('document'), uploadFinalDocument);
router.post('/:id/working-document', authMiddleware, uploadDocument.single('document'), uploadWorkingDocument);

// Reviewer routes
router.post('/:id/reviews', authMiddleware, submitPeerReview);

// Editor routes
router.post('/:id/assign-reviewers', authMiddleware, requireRole(['editor', 'admin']), assignReviewers);
router.patch('/:id/decision', authMiddleware, requireRole(['editor', 'admin']), makeEditorDecision);
router.post('/:id/publish', authMiddleware, requireRole(['editor', 'admin']), publishManuscript);

export default router;
