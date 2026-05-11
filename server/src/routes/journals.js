import express from 'express';
import { create, getById, search, update, deleteJournal } from '../controllers/journalController.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/search', search);
router.get('/:id', getById);
router.post('/', authMiddleware, create);
router.patch('/:id', authMiddleware, update);
router.delete('/:id', authMiddleware, adminMiddleware, deleteJournal);

export default router;
