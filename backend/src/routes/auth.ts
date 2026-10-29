import { Router, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/connection.js';
import { createAuthToken, verifyToken } from '../middleware/auth.js';
import type { AuthenticatedUser, UserRole } from '../services/access.js';

const router = Router();

interface LoginRow {
  id: number;
  email: string;
  password_hash: string;
  role: UserRole;
  employee_id: number;
  name: string;
}

function sendError(
  response: Response,
  status: number,
  code: string,
  message: string,
): void {
  response.status(status).json({ error: { code, message } });
}

router.post('/login', (request, response) => {
  const body = request.body as { email?: unknown; password?: unknown } | undefined;
  if (typeof body?.email !== 'string' || typeof body.password !== 'string') {
    sendError(response, 400, 'INVALID_REQUEST', 'Email and password are required.');
    return;
  }

  const email = body.email.trim().toLowerCase();
  const password = body.password;
  if (!email || !password) {
    sendError(response, 400, 'INVALID_REQUEST', 'Email and password are required.');
    return;
  }

  try {
    const row = db
      .prepare(
        `SELECT u.id, u.email, u.password_hash, u.role, u.employee_id, e.name
         FROM users AS u
         JOIN employees AS e ON e.id = u.employee_id
         WHERE u.email = ?`,
      )
      .get(email) as LoginRow | undefined;

    if (!row || !bcrypt.compareSync(password, row.password_hash)) {
      sendError(response, 401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
      return;
    }

    const user: AuthenticatedUser = {
      id: row.id,
      email: row.email,
      role: row.role,
      employee_id: row.employee_id,
      name: row.name,
    };

    let token: string;
    try {
      token = createAuthToken(user);
    } catch {
      sendError(response, 500, 'AUTH_CONFIG_ERROR', 'JWT_SECRET is not configured on the server.');
      return;
    }

    response.json({ token, user });
  } catch (error) {
    console.error('Login failed:', error);
    sendError(response, 500, 'INTERNAL_ERROR', 'The login request could not be completed.');
  }
});

router.get('/me', verifyToken, (request, response) => {
  if (!request.user) {
    sendError(response, 401, 'AUTH_REQUIRED', 'Authentication is required.');
    return;
  }

  response.json(request.user);
});

export default router;
