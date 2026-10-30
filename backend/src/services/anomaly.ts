import { DEFAULT_WINDOW_DAYS } from '../config.js';
import { db } from '../db/connection.js';
import type { AuthenticatedUser } from './access.js';
import { getVisibleEmployeeIds } from './access.js';
import { computeFeatures, getAsOfDate } from './features.js';

const REASON_LABELS: Record<string, string> = {
  avg_checkin_delay: 'Average check-in delay',
  late_count: 'Late arrivals',
  leaves_taken: 'Leaves taken',
  weekend_adjacent_leaves: 'Monday/Friday leaves',
  overtime_hrs: 'Overtime hours',
  absent_days: 'Absent days',
};

interface MlReason { feature: string; value: number; group_mean: number; z_score: number }
interface MlResult { employee_id: number; is_anomaly: boolean; severity: number; reasons: MlReason[] }
interface PersonRow { id: number; name: string; department: string }

export interface AnomalyReason { feature: string; text: string }
export interface AnomalyAlert { employee_id: number; name: string; department: string; severity: number; reasons: AnomalyReason[] }
export interface AnomalyResponse {
  as_of_date: string;
  window_days: number;
  contamination: number;
  total_analysed: number;
  anomalies: AnomalyAlert[];
}

export class AnomalyError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) { super(message); }
}

function reasonText(reason: MlReason): string {
  const label = REASON_LABELS[reason.feature] ?? reason.feature;
  const unit = reason.feature === 'avg_checkin_delay' ? 'min' : reason.feature === 'overtime_hrs' ? 'hrs' : '';
  return `${label} is ${reason.z_score} standard deviations above the group (${reason.value}${unit} vs ${reason.group_mean}${unit} average)`;
}

export async function listAnomalies(user: AuthenticatedUser, windowDays = DEFAULT_WINDOW_DAYS, contamination = 0.1): Promise<AnomalyResponse> {
  const asOfDate = getAsOfDate();
  if (!asOfDate) throw new AnomalyError(404, 'NOT_FOUND', 'No attendance data is available.');

  const people = db.prepare(
    `SELECT e.id, e.name, e.department FROM employees e JOIN users u ON u.employee_id = e.id
     WHERE e.is_active = 1 AND u.role != 'hr' ORDER BY e.id`,
  ).all() as PersonRow[];
  const features = computeFeatures(people.map((person) => person.id), windowDays, asOfDate);
  const mlEmployees = features.map(({ employee_id, avg_checkin_delay, late_count, leaves_taken, weekend_adjacent_leaves, overtime_hrs, absent_days }) =>
    ({ employee_id, avg_checkin_delay, late_count, leaves_taken, weekend_adjacent_leaves, overtime_hrs, absent_days }));

  let mlResults: MlResult[];
  try {
    const baseUrl = (process.env['ML_SERVICE_URL'] ?? 'http://localhost:5001').replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/detect-anomalies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contamination, employees: mlEmployees }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`ML service returned ${response.status}`);
    const result = await response.json() as { results?: MlResult[] };
    if (!Array.isArray(result.results)) throw new Error('ML service response is invalid');
    mlResults = result.results;
  } catch {
    throw new AnomalyError(503, 'ML_UNAVAILABLE', 'Anomaly detection is temporarily unavailable. Start the ML service and try again.');
  }

  const peopleById = new Map(people.map((person) => [person.id, person]));
  const visibleIds = new Set(getVisibleEmployeeIds(user).filter((id) => user.role !== 'manager' || id !== user.employee_id));
  const anomalies = mlResults
    .filter((result) => result.is_anomaly && visibleIds.has(result.employee_id))
    .map((result) => {
      const person = peopleById.get(result.employee_id);
      if (!person) return null;
      return {
        employee_id: person.id,
        name: person.name,
        department: person.department,
        severity: result.severity,
        reasons: result.reasons.map((reason) => ({ feature: reason.feature, text: reasonText(reason) })),
      };
    })
    .filter((alert): alert is AnomalyAlert => alert !== null)
    .sort((a, b) => b.severity - a.severity);

  return { as_of_date: asOfDate, window_days: windowDays, contamination, total_analysed: features.length, anomalies };
}
