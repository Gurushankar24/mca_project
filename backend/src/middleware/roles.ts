import type { RequestHandler } from 'express';
import type { UserRole } from '../services/access.js';

export function requireRole(...allowedRoles: UserRole[]): RequestHandler {
  return (request, response, next) => {
    if (!request.user) {
      response.status(401).json({
        error: { code: 'AUTH_REQUIRED', message: 'Authentication is required.' },
      });
      return;
    }

    if (!allowedRoles.includes(request.user.role)) {
      response.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You do not have permission to access this resource.' },
      });
      return;
    }

    next();
  };
}
