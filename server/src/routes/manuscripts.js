import express from 'express';
import {
  submitManuscript,
  listManuscripts,
  viewManuscript,
  updateManuscript,
  assignReviewers,
  submitPeerReview,
  makeEditorDecision,
  publishManuscript,
} from '../controllers/manuscriptController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Author routes
router.post('/', authMiddleware, submitManuscript);
router.get('/', authMiddleware, listManuscripts);
router.get('/:id', authMiddleware, viewManuscript);
router.patch('/:id', authMiddleware, updateManuscript);

// Reviewer routes
router.post('/:id/reviews', authMiddleware, submitPeerReview);

// Editor routes
router.post('/:id/assign-reviewers', authMiddleware, requireRole(['editor', 'admin']), assignReviewers);
router.patch('/:id/decision', authMiddleware, requireRole(['editor', 'admin']), makeEditorDecision);
router.post('/:id/publish', authMiddleware, requireRole(['editor', 'admin']), publishManuscript);

export default router;
