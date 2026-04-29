import express from 'express';
import { create, getById, search, update } from '../controllers/journalController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/search', search);
router.get('/:id', getById);
router.post('/', authMiddleware, create);
router.patch('/:id', authMiddleware, update);

export default router;
