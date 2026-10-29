import { Router, type Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  assignEmployees,
  createEmployee,
  deactivateEmployee,
  EmployeeServiceError,
  getEmployee,
  listEmployees,
  listManagers,
  updateEmployee,
} from '../services/employees.js';

const router = Router();
router.use(verifyToken);

function sendFailure(response: Response, error: unknown): void {
  if (error instanceof EmployeeServiceError) {
    response.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  console.error('Employee request failed:', error);
  response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.' } });
}

function parseId(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

router.get('/employees', requireRole('hr', 'manager'), (request, response) => {
  try {
    const department = typeof request.query['department'] === 'string' ? request.query['department'].trim() : '';
    const search = typeof request.query['search'] === 'string' ? request.query['search'].trim() : '';
    response.json(listEmployees(request.user!, { department, search }));
  } catch (error) { sendFailure(response, error); }
});

router.get('/employees/:id', requireRole('hr', 'manager', 'employee'), (request, response) => {
  const id = parseId(request.params['id']);
  if (!id) { response.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'A valid employee id is required.' } }); return; }
  try { response.json(getEmployee(request.user!, id)); } catch (error) { sendFailure(response, error); }
});

router.post('/employees', requireRole('hr'), (request, response) => {
  try { response.status(201).json(createEmployee(request.body)); } catch (error) { sendFailure(response, error); }
});

router.put('/employees/:id', requireRole('hr'), (request, response) => {
  const id = parseId(request.params['id']);
  if (!id) { response.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'A valid employee id is required.' } }); return; }
  try { response.json(updateEmployee(request.user!, id, request.body)); } catch (error) { sendFailure(response, error); }
});

router.delete('/employees/:id', requireRole('hr'), (request, response) => {
  const id = parseId(request.params['id']);
  if (!id) { response.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'A valid employee id is required.' } }); return; }
  try { deactivateEmployee(request.user!, id); response.status(204).end(); } catch (error) { sendFailure(response, error); }
});

router.get('/managers', requireRole('hr'), (_request, response) => {
  try { response.json(listManagers()); } catch (error) { sendFailure(response, error); }
});

router.post('/managers/:id/assign', requireRole('hr'), (request, response) => {
  const id = parseId(request.params['id']);
  if (!id) { response.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'A valid manager id is required.' } }); return; }
  try {
    const body = request.body as { employee_ids?: unknown } | undefined;
    response.json(assignEmployees(request.user!, id, body?.employee_ids));
  } catch (error) { sendFailure(response, error); }
});

export default router;
