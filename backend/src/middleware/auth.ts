import type { RequestHandler, Response } from 'express';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import type { AuthenticatedUser, UserRole } from '../services/access.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

function sendError(response: Response, status: number, code: string, message: string): void {
  response.status(status).json({ error: { code, message } });
}

export function getJwtSecret(): string | undefined {
  const secret = process.env['JWT_SECRET']?.trim();
  return secret || undefined;
}

export function createAuthToken(user: AuthenticatedUser): string {
  const secret = getJwtSecret();
  if (!secret) {
    throw new Error('JWT_SECRET is not configured. Set it in the backend environment.');
  }

  const expiresIn = (process.env['JWT_EXPIRES_IN'] ?? '8h') as SignOptions['expiresIn'];
  return jwt.sign(user, secret, { expiresIn });
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'hr' || value === 'manager' || value === 'employee';
}

function isAuthenticatedUser(value: string | JwtPayload): value is JwtPayload & AuthenticatedUser {
  return (
    typeof value !== 'string' &&
    Number.isInteger(value['id']) &&
    Number.isInteger(value['employee_id']) &&
    typeof value['email'] === 'string' &&
    typeof value['name'] === 'string' &&
    isUserRole(value['role'])
  );
}

export const verifyToken: RequestHandler = (request, response, next) => {
  const authorization = request.header('Authorization');
  const [scheme, token, extra] = authorization?.trim().split(/\s+/) ?? [];

  if (scheme !== 'Bearer' || !token || extra) {
    sendError(response, 401, 'AUTH_REQUIRED', 'A Bearer token is required.');
    return;
  }

  const secret = getJwtSecret();
  if (!secret) {
    sendError(response, 500, 'AUTH_CONFIG_ERROR', 'JWT_SECRET is not configured on the server.');
    return;
  }

  try {
    const payload = jwt.verify(token, secret);
    if (!isAuthenticatedUser(payload)) {
      sendError(response, 401, 'INVALID_TOKEN', 'The provided token is invalid.');
      return;
    }

    request.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      employee_id: payload.employee_id,
      name: payload.name,
    };
    next();
  } catch {
    sendError(response, 401, 'INVALID_TOKEN', 'The provided token is invalid or expired.');
  }
}
