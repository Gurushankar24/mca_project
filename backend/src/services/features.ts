import { db } from '../db/connection.js';

export interface EmployeeFeatures {
  employee_id: number;
  working_days: number;
  avg_checkin_delay: number;
  late_count: number;
  leaves_taken: number;
  weekend_adjacent_leaves: number;
  overtime_hrs: number;
  absent_days: number;
  present_days: number;
  late_days: number;
}

export function getAsOfDate(): string | null {
  const row = db.prepare('SELECT MAX(date) AS as_of_date FROM attendance').get() as { as_of_date: string | null };
  return row.as_of_date;
}

export function computeFeatures(employeeIds: number[], windowDays: number, asOfDate: string): EmployeeFeatures[] {
  if (employeeIds.length === 0) return [];
  const placeholders = employeeIds.map(() => '?').join(',');
  const startDate = db.prepare("SELECT date(?, '-' || ? || ' days') AS start_date")
    .get(asOfDate, Math.max(0, windowDays - 1)) as { start_date: string };
  const rows = db.prepare(
    `SELECT e.id AS employee_id,
      SUM(CASE WHEN a.status != 'leave' THEN 1 ELSE 0 END) AS working_days,
      AVG(CASE WHEN a.check_in IS NOT NULL
        THEN (CAST(substr(a.check_in, 1, 2) AS INTEGER) * 60 + CAST(substr(a.check_in, 4, 2) AS INTEGER)) - 540
        ELSE NULL END) AS avg_checkin_delay,
      SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) AS late_count,
      SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present_days,
      SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) AS late_days,
      SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent_days,
      COALESCE(SUM(a.overtime_hours), 0) AS overtime_hrs,
      (SELECT COUNT(*) FROM leaves l WHERE l.employee_id = e.id AND l.approved = 1
        AND l.date BETWEEN ? AND ?) AS leaves_taken,
      (SELECT COUNT(*) FROM leaves l WHERE l.employee_id = e.id AND l.approved = 1
        AND l.date BETWEEN ? AND ? AND strftime('%w', l.date) IN ('1', '5')) AS weekend_adjacent_leaves
     FROM employees e LEFT JOIN attendance a ON a.employee_id = e.id AND a.date BETWEEN ? AND ?
     WHERE e.id IN (${placeholders}) AND e.is_active = 1
     GROUP BY e.id ORDER BY e.id`,
  ).all(startDate.start_date, asOfDate, startDate.start_date, asOfDate, startDate.start_date, asOfDate, ...employeeIds) as Array<Record<string, number | null>>;

  return rows.map((row) => ({
    employee_id: Number(row['employee_id']),
    working_days: Number(row['working_days'] ?? 0),
    avg_checkin_delay: round2(Number(row['avg_checkin_delay'] ?? 0)),
    late_count: Number(row['late_count'] ?? 0),
    leaves_taken: Number(row['leaves_taken'] ?? 0),
    weekend_adjacent_leaves: Number(row['weekend_adjacent_leaves'] ?? 0),
    overtime_hrs: round2(Number(row['overtime_hrs'] ?? 0)),
    absent_days: Number(row['absent_days'] ?? 0),
    present_days: Number(row['present_days'] ?? 0),
    late_days: Number(row['late_days'] ?? 0),
  }));
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
