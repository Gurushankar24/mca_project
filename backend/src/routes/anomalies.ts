import { Router } from 'express';
import { DEFAULT_WINDOW_DAYS } from '../config.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { AnomalyError, listAnomalies } from '../services/anomaly.js';

const router = Router();
router.use(verifyToken);

function readInteger(value: unknown, fallback: number, minimum: number, maximum: number): number | null {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

router.get('/', requireRole('hr', 'manager'), async (request, response) => {
  const windowDays = readInteger(request.query['window'], DEFAULT_WINDOW_DAYS, 1, 365);
  const contaminationValue = request.query['contamination'];
  const contamination = contaminationValue === undefined ? 0.1
    : typeof contaminationValue === 'string' && contaminationValue.trim() !== '' ? Number(contaminationValue) : NaN;
  if (windowDays === null || !Number.isFinite(contamination) || contamination < 0.01 || contamination > 0.3) {
    response.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'window must be 1 to 365 days and contamination must be between 0.01 and 0.3.' } });
    return;
  }
  try {
    response.json(await listAnomalies(request.user!, windowDays, contamination));
  } catch (error) {
    if (error instanceof AnomalyError) {
      response.status(error.status).json({ error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Anomaly request failed:', error);
    response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.' } });
  }
});

export default router;
