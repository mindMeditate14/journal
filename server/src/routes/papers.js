import express from 'express';
import { getById, getGraph, getRelated, search } from '../controllers/paperController.js';

const router = express.Router();

router.get('/search', search);
router.get('/:id/graph', getGraph);
router.get('/:id/related', getRelated);
router.get('/:id', getById);

export default router;