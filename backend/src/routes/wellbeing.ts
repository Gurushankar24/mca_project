import { Router, type Response } from 'express';
import { DEFAULT_WINDOW_DAYS } from '../config.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { getEmployeeWellbeing, listWellbeing, WellbeingError } from '../services/wellbeing.js';

const router = Router();
router.use(verifyToken);

function sendFailure(response: Response, error: unknown): void {
  if (error instanceof WellbeingError) {
    response.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  console.error('Wellbeing request failed:', error);
  response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.' } });
}

function readWindow(value: unknown): number | null {
  if (value === undefined) return DEFAULT_WINDOW_DAYS;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const days = Number(value);
  return Number.isInteger(days) && days > 0 && days <= 365 ? days : null;
}

router.get('/', requireRole('hr', 'manager'), (request, response) => {
  const windowDays = readWindow(request.query['window']);
  if (windowDays === null) { response.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'window must be an integer from 1 to 365.' } }); return; }
  try { response.json(listWellbeing(request.user!, windowDays)); } catch (error) { sendFailure(response, error); }
});

router.get('/:employeeId', requireRole('hr', 'manager', 'employee'), (request, response) => {
  const employeeId = Number(request.params['employeeId']);
  const windowDays = readWindow(request.query['window']);
  if (!Number.isInteger(employeeId) || employeeId < 1 || windowDays === null) {
    response.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'A valid employee id and window from 1 to 365 are required.' } });
    return;
  }
  try { response.json(getEmployeeWellbeing(request.user!, employeeId, windowDays)); } catch (error) { sendFailure(response, error); }
});

export default router;
