import { DEFAULT_WINDOW_DAYS } from '../config.js';
import type { AuthenticatedUser } from './access.js';
import { getVisibleEmployeeIds } from './access.js';
import { AnomalyError, listAnomalies } from './anomaly.js';
import { listWellbeing } from './wellbeing.js';

export interface DashboardSummary {
  total_employees: number;
  avg_score: number;
  band_counts: { green: number; amber: number; red: number };
  anomaly_count: number;
  top_anomalies: Awaited<ReturnType<typeof listAnomalies>>['anomalies'];
  ml_unavailable?: boolean;
}

/** Compose the dashboard from the same scoped services used by the analytics pages. */
export async function getDashboardSummary(user: AuthenticatedUser): Promise<DashboardSummary> {
  // Resolve visibility here as well as in each analytics service so this endpoint
  // never builds a dashboard from employees outside the caller's permitted scope.
  const visibleIds = new Set(getVisibleEmployeeIds(user));
  const wellbeing = listWellbeing(user).filter((row) => visibleIds.has(row.employee_id));
  const band_counts = { green: 0, amber: 0, red: 0 };
  for (const row of wellbeing) band_counts[row.band] += 1;

  const summary: DashboardSummary = {
    total_employees: wellbeing.length,
    avg_score: wellbeing.length
      ? Math.round(wellbeing.reduce((total, row) => total + row.score, 0) / wellbeing.length)
      : 0,
    band_counts,
    anomaly_count: 0,
    top_anomalies: [],
  };

  try {
    const anomalyResult = await listAnomalies(user, DEFAULT_WINDOW_DAYS);
    summary.anomaly_count = anomalyResult.anomalies.length;
    summary.top_anomalies = anomalyResult.anomalies.slice(0, 5);
  } catch (error) {
    if (!(error instanceof AnomalyError) || error.code !== 'ML_UNAVAILABLE') throw error;
    // Wellbeing stays available while the optional Flask-backed metric is down.
    summary.ml_unavailable = true;
  }
  return summary;
}
