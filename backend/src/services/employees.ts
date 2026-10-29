import bcrypt from 'bcryptjs';
import { db } from '../db/connection.js';
import type { AuthenticatedUser } from './access.js';
import { getVisibleEmployeeIds } from './access.js';

export class EmployeeServiceError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type EmployeeFields = {
  name: string;
  email: string;
  department: string;
  job_title: string;
  join_date: string;
  manager_id: number | null;
};

type EmployeeInput = Partial<EmployeeFields> & { role?: string };

const employeeSelect = `SELECT e.id, e.name, e.email, e.department, e.job_title,
  e.manager_id, m.name AS manager_name, e.join_date, e.is_active
  FROM employees AS e LEFT JOIN employees AS m ON m.id = e.manager_id`;

function invalid(message: string): never {
  throw new EmployeeServiceError(400, 'INVALID_REQUEST', message);
}

function notFound(message = 'Employee was not found.'): never {
  throw new EmployeeServiceError(404, 'NOT_FOUND', message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateFields(input: unknown, requireAll: boolean): Partial<EmployeeFields> {
  if (!isRecord(input)) invalid('A JSON object is required.');
  const fields: Partial<EmployeeFields> = {};
  const stringFields = ['name', 'email', 'department', 'job_title', 'join_date'] as const;
  for (const field of stringFields) {
    const value = input[field];
    if (value === undefined && !requireAll) continue;
    if (typeof value !== 'string' || !value.trim()) invalid(`${field} is required.`);
    fields[field] = field === 'email' ? value.trim().toLowerCase() : value.trim();
  }
  if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    invalid('A valid email address is required.');
  }
  if (input['manager_id'] !== undefined || requireAll) {
    const managerId = input['manager_id'];
    if (managerId === null || managerId === '') fields.manager_id = null;
    else if (Number.isInteger(managerId) && Number(managerId) > 0) fields.manager_id = Number(managerId);
    else invalid('manager_id must be a positive integer or null.');
  }
  return fields;
}

function validateManager(managerId: number | null): void {
  if (managerId === null) return;
  const manager = db.prepare(
    `SELECT e.id FROM employees e JOIN users u ON u.employee_id = e.id
     WHERE e.id = ? AND e.is_active = 1 AND u.role = 'manager'`,
  ).get(managerId);
  if (!manager) invalid('manager_id must identify an active manager.');
}

function mapDatabaseError(error: unknown): never {
  if (error instanceof EmployeeServiceError) throw error;
  if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
    throw new EmployeeServiceError(400, 'EMAIL_IN_USE', 'An employee or user already uses that email.');
  }
  throw error;
}

export function listEmployees(
  user: AuthenticatedUser,
  filters: { department?: string; search?: string },
): unknown[] {
  const visibleIds = getVisibleEmployeeIds(user);
  if (!visibleIds.length) return [];
  const clauses = [`e.id IN (${visibleIds.map(() => '?').join(',')})`];
  const params: Array<string | number> = [...visibleIds];
  if (filters.department) {
    clauses.push('e.department = ?');
    params.push(filters.department);
  }
  if (filters.search) {
    clauses.push('(e.name LIKE ? COLLATE NOCASE OR e.email LIKE ? COLLATE NOCASE)');
    const search = `%${filters.search}%`;
    params.push(search, search);
  }
  clauses.push('e.is_active = 1');
  return db.prepare(`${employeeSelect} WHERE ${clauses.join(' AND ')} ORDER BY e.name`).all(...params);
}

export function getEmployee(user: AuthenticatedUser, id: number): unknown {
  if (!getVisibleEmployeeIds(user).includes(id)) {
    throw new EmployeeServiceError(403, 'FORBIDDEN', 'You cannot access this employee.');
  }
  const employee = db.prepare(`${employeeSelect} WHERE e.id = ?`).get(id);
  if (!employee) notFound();
  return employee;
}

export function createEmployee(input: unknown): unknown {
  if (!isRecord(input) || !['hr', 'manager', 'employee'].includes(String(input['role']))) {
    invalid('role must be hr, manager, or employee.');
  }
  const fields = validateFields(input, true) as EmployeeFields;
  validateManager(fields.manager_id);
  try {
    const create = db.transaction(() => {
      const employeeResult = db.prepare(
        `INSERT INTO employees (name, email, department, job_title, manager_id, join_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(fields.name, fields.email, fields.department, fields.job_title, fields.manager_id, fields.join_date);
      const employeeId = Number(employeeResult.lastInsertRowid);
      const passwordHash = bcrypt.hashSync('Pass@123', 10);
      db.prepare('INSERT INTO users (email, password_hash, role, employee_id) VALUES (?, ?, ?, ?)')
        .run(fields.email, passwordHash, input['role'], employeeId);
      return employeeId;
    });
    const id = create();
    return db.prepare(`${employeeSelect} WHERE e.id = ?`).get(id);
  } catch (error) {
    mapDatabaseError(error);
  }
}

export function updateEmployee(user: AuthenticatedUser, id: number, input: unknown): unknown {
  if (!getVisibleEmployeeIds(user).includes(id)) {
    throw new EmployeeServiceError(403, 'FORBIDDEN', 'You cannot access this employee.');
  }
  const fields = validateFields(input, false);
  const allowed = Object.keys(fields) as Array<keyof EmployeeFields>;
  if (!allowed.length) invalid('At least one employee field must be provided.');
  if (fields.manager_id !== undefined) validateManager(fields.manager_id);
  const current = db.prepare('SELECT id FROM employees WHERE id = ?').get(id);
  if (!current) notFound();
  const assignments = allowed.map((field) => `${field} = ?`).join(', ');
  try {
    const update = db.transaction(() => {
      db.prepare(`UPDATE employees SET ${assignments} WHERE id = ?`)
        .run(...allowed.map((field) => fields[field] as string | number | null), id);
      if (fields.email !== undefined) {
        db.prepare('UPDATE users SET email = ? WHERE employee_id = ?').run(fields.email, id);
      }
    });
    update();
    return db.prepare(`${employeeSelect} WHERE e.id = ?`).get(id);
  } catch (error) {
    mapDatabaseError(error);
  }
}

export function deactivateEmployee(user: AuthenticatedUser, id: number): void {
  if (!getVisibleEmployeeIds(user).includes(id)) {
    throw new EmployeeServiceError(403, 'FORBIDDEN', 'You cannot access this employee.');
  }
  const result = db.prepare('UPDATE employees SET is_active = 0 WHERE id = ?').run(id);
  if (!result.changes) notFound();
}

export function listManagers(): unknown[] {
  return db.prepare(
    `SELECT e.id, e.name, e.email, e.department, e.job_title
     FROM employees e JOIN users u ON u.employee_id = e.id
     WHERE u.role = 'manager' AND e.is_active = 1 ORDER BY e.name`,
  ).all();
}

export function assignEmployees(user: AuthenticatedUser, managerId: number, employeeIds: unknown): { manager_id: number; employee_ids: number[] } {
  if (!Array.isArray(employeeIds) || employeeIds.some((id) => !Number.isInteger(id) || Number(id) <= 0)) {
    invalid('employee_ids must be an array of positive integer ids.');
  }
  if (new Set(employeeIds).size !== employeeIds.length) invalid('employee_ids cannot contain duplicates.');
  const visibleIds = new Set(getVisibleEmployeeIds(user));
  if (!visibleIds.has(managerId) || (employeeIds as number[]).some((id) => !visibleIds.has(id))) {
    throw new EmployeeServiceError(403, 'FORBIDDEN', 'You cannot access one or more requested employees.');
  }
  const manager = db.prepare(
    `SELECT e.id FROM employees e JOIN users u ON u.employee_id = e.id
     WHERE e.id = ? AND e.is_active = 1 AND u.role = 'manager'`,
  ).get(managerId);
  if (!manager) notFound('Manager was not found.');
  try {
    const assign = db.transaction((ids: number[]) => {
      const check = db.prepare(
        `SELECT e.id FROM employees e JOIN users u ON u.employee_id = e.id
         WHERE e.id = ? AND e.is_active = 1 AND u.role = 'employee'`,
      );
      for (const id of ids) {
        if (id === managerId || !check.get(id)) invalid(`Employee ${id} is not an active assignable employee.`);
      }
      const update = db.prepare('UPDATE employees SET manager_id = ? WHERE id = ?');
      for (const id of ids) update.run(managerId, id);
    });
    assign(employeeIds as number[]);
    return { manager_id: managerId, employee_ids: employeeIds as number[] };
  } catch (error) {
    mapDatabaseError(error);
  }
}
