import express from 'express';
import {
  createPracticeData,
  getPracticeData,
  listPracticeData,
  addPatientData,
  bulkAddPatientData,
  generateStatistics,
  updatePracticeData,
  deletePracticeData,
  markReadyForManuscript,
} from '../controllers/practiceDataController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Practice Data Management
router.post('/', createPracticeData); // Create new practice data collection
router.get('/', listPracticeData); // List all practice data
router.get('/:id', getPracticeData); // Get specific practice data
router.patch('/:id', updatePracticeData); // Update practice data metadata
router.delete('/:id', deletePracticeData); // Delete practice data

// Patient Data Management
router.post('/:id/patients', addPatientData); // Add single patient data
router.post('/:id/patients/bulk', bulkAddPatientData); // Bulk add patient data (CSV import)

// Statistics & Analysis
router.post('/:id/statistics', generateStatistics); // Generate statistics from patient data
router.post('/:id/ready-for-manuscript', markReadyForManuscript); // Mark data as ready for manuscript generation

export default router;
