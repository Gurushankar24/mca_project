import { db } from '../db/connection.js';

export type UserRole = 'hr' | 'manager' | 'employee';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: UserRole;
  employee_id: number;
  name: string;
}

/** Return the employee ids this user's role is allowed to see. */
export function getVisibleEmployeeIds(user: AuthenticatedUser): number[] {
  if (user.role === 'hr') {
    const rows = db.prepare('SELECT id FROM employees WHERE is_active = 1 ORDER BY id').all() as Array<{
      id: number;
    }>;
    return rows.map((row) => row.id);
  }

  if (user.role === 'manager') {
    const rows = db
      .prepare(
        `SELECT id FROM employees
         WHERE manager_id = ? OR id = ?
         ORDER BY id`,
      )
      .all(user.employee_id, user.employee_id) as Array<{ id: number }>;
    return rows.map((row) => row.id);
  }

  return [user.employee_id];
}
