import express from 'express';
import { forgotPassword, resetPassword } from '../controllers/passwordResetController.js';

const router = express.Router();

// Public routes - no auth required
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
