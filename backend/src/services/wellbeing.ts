import { DEFAULT_WINDOW_DAYS, WELLBEING_WEIGHTS } from '../config.js';
import { db } from '../db/connection.js';
import type { AuthenticatedUser } from './access.js';
import { getVisibleEmployeeIds } from './access.js';
import { computeFeatures, getAsOfDate, type EmployeeFeatures } from './features.js';

export type WellbeingBand = 'green' | 'amber' | 'red';
export type WellbeingFactor = keyof typeof WELLBEING_WEIGHTS;

export interface WellbeingResult {
  employee_id: number;
  name: string;
  department: string;
  score: number;
  band: WellbeingBand;
  weakest_factor: WellbeingFactor;
  as_of_date: string;
  window_days: number;
  breakdown: Record<WellbeingFactor, { value: number; weight: number; contribution: number }>;
}
export type WellbeingListResult = Omit<WellbeingResult, 'breakdown'>;

export class WellbeingError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }
}

type PersonRow = { id: number; name: string; department: string };

function clamp(value: number): number { return Math.max(0, Math.min(1, value)); }
function round2(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }

/** Apply the transparent weighted formula to four factor values. */
export function calculateWellbeingScore(values: Record<WellbeingFactor, number>) {
  // Keep every factor between zero and one so higher always means better.
  const components = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, clamp(value)])) as Record<WellbeingFactor, number>;
  // Multiply each factor by its fixed weight to show its contribution to the 100-point score.
  const breakdown = Object.fromEntries(Object.entries(WELLBEING_WEIGHTS).map(([key, weight]) => {
    const factor = key as WellbeingFactor;
    return [factor, { value: round2(components[factor]), weight, contribution: round2(components[factor] * weight * 100) }];
  })) as Record<WellbeingFactor, { value: number; weight: number; contribution: number }>;
  // Add the weighted contributions and round the final result to a whole number.
  const score = Math.round((components.attendance * WELLBEING_WEIGHTS.attendance
    + components.performance * WELLBEING_WEIGHTS.performance
    + components.workload * WELLBEING_WEIGHTS.workload
    + components.leave * WELLBEING_WEIGHTS.leave) * 100);
  // Find the factor with the smallest component value for the callout.
  const weakest_factor = (Object.keys(components) as WellbeingFactor[]).reduce((weakest, factor) =>
    components[factor] < components[weakest] ? factor : weakest, 'attendance');
  const band: WellbeingBand = score >= 75 ? 'green' : score >= 50 ? 'amber' : 'red';
  return { score, band, weakest_factor, breakdown };
}

function getPerformance(employeeId: number): number {
  const ratings = db.prepare("SELECT score FROM ratings WHERE employee_id = ? ORDER BY CAST(substr(quarter, 4, 4) AS INTEGER) DESC, CAST(substr(quarter, 2, 1) AS INTEGER) DESC LIMIT 2")
    .all(employeeId) as Array<{ score: number }>;
  if (!ratings.length) return 0;
  let value = ratings[0].score / 5;
  if (ratings.length > 1 && ratings[0].score > ratings[1].score) value += 0.05;
  if (ratings.length > 1 && ratings[0].score < ratings[1].score) value -= 0.05;
  return clamp(value);
}

function buildResults(employeeIds: number[], windowDays: number, asOfDate: string): WellbeingResult[] {
  const activePeople = db.prepare(
    `SELECT e.id, e.name, e.department FROM employees e
     JOIN users u ON u.employee_id = e.id
     WHERE e.is_active = 1 AND u.role != 'hr' ORDER BY e.id`,
  ).all() as PersonRow[];
  const allFeatures = computeFeatures(activePeople.map((person) => person.id), windowDays, asOfDate);
  const targetIds = new Set(employeeIds);
  const features = allFeatures.filter((feature) => targetIds.has(feature.employee_id));
  if (!features.length) return [];
  // Department averages use all active analysed employees, even for a manager's scoped list.
  const people = activePeople;
  const departments = new Map(people.map((person) => [person.id, person.department]));
  const departmentAverages = new Map<string, number>();
  for (const person of people) {
    const members = allFeatures.filter((feature) => departments.get(feature.employee_id) === person.department);
    departmentAverages.set(person.department, members.reduce((sum, item) => sum + item.leaves_taken, 0) / members.length);
  }
  const personById = new Map(people.map((person) => [person.id, person]));
  const resultById = new Map<number, WellbeingResult>();
  for (const feature of features) {
    const person = personById.get(feature.employee_id)!;
    const values = getFactorValues(feature, getPerformance(feature.employee_id), departmentAverages.get(person.department) ?? 0);
    resultById.set(feature.employee_id, {
      employee_id: person.id, name: person.name, department: person.department,
      ...calculateWellbeingScore(values), as_of_date: asOfDate, window_days: windowDays,
    });
  }
  return [...resultById.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function getFactorValues(feature: EmployeeFeatures, performance: number, departmentAverage: number): Record<WellbeingFactor, number> {
  // Attendance gives half credit for late days and zero for absent or leave days.
  const attendance = feature.working_days === 0 ? 0 : (feature.present_days + 0.5 * feature.late_days) / feature.working_days;
  // Workload decreases as overtime approaches forty hours in the scoring window.
  const workload = 1 - Math.min(feature.overtime_hrs / 40, 1);
  // Leave is compared with this department's average so departments are treated fairly.
  const leave = 1 - Math.min(Math.abs(feature.leaves_taken - departmentAverage) / 5, 1);
  return { attendance: clamp(attendance), performance, workload: clamp(workload), leave: clamp(leave) };
}

export function listWellbeing(user: AuthenticatedUser, windowDays = DEFAULT_WINDOW_DAYS): WellbeingListResult[] {
  const visibleIds = getVisibleEmployeeIds(user);
  if (!visibleIds.length) return [];
  const asOfDate = getAsOfDate();
  if (!asOfDate) return [];
  return buildResults(visibleIds, windowDays, asOfDate).map(({ breakdown: _breakdown, ...row }) => row);
}

export function getEmployeeWellbeing(user: AuthenticatedUser, employeeId: number, windowDays = DEFAULT_WINDOW_DAYS): WellbeingResult {
  if (!getVisibleEmployeeIds(user).includes(employeeId)) {
    throw new WellbeingError(403, 'FORBIDDEN', 'You cannot access this employee.');
  }
  const asOfDate = getAsOfDate();
  if (!asOfDate) throw new WellbeingError(404, 'NOT_FOUND', 'No wellbeing data is available.');
  const result = buildResults([employeeId], windowDays, asOfDate)[0];
  if (!result) throw new WellbeingError(404, 'NOT_FOUND', 'Employee wellbeing data was not found.');
  return result;
}
