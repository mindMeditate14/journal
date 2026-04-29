import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  createProject,
  getProjectById,
  listProjects,
} from '../controllers/projectController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/projects', listProjects);
router.get('/projects/:id', getProjectById);
router.post('/projects', createProject);

export default router;