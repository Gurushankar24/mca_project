import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { getDashboardSummary } from '../services/dashboard.js';

const router = Router();
router.use(verifyToken, requireRole('hr', 'manager'));

router.get('/summary', async (request, response) => {
  try {
    response.json(await getDashboardSummary(request.user!));
  } catch (error) {
    console.error('Dashboard summary failed:', error);
    response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'The dashboard could not be loaded.' } });
  }
});

export default router;
