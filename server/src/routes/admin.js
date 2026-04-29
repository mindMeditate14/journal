import express from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { listUsers, changeUserRole, setUserActive, getAdminStats } from '../controllers/adminController.js';

const router = express.Router();

// All admin routes require auth + admin role
router.use(authMiddleware, adminMiddleware);

router.get('/stats', getAdminStats);
router.get('/users', listUsers);
router.patch('/users/:userId/role', changeUserRole);
router.patch('/users/:userId/active', setUserActive);

export default router;
