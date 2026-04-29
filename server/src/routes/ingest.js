import express from 'express';
import { getIngestRuns, ingestOpenAlex, retryIngestRun } from '../controllers/ingestController.js';
import { adminMiddleware, authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/openalex', authMiddleware, ingestOpenAlex);
router.get('/runs', authMiddleware, adminMiddleware, getIngestRuns);
router.post('/runs/:id/retry', authMiddleware, adminMiddleware, retryIngestRun);

export default router;