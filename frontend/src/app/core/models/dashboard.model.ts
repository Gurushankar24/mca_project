import { AnomalyAlert } from './anomaly.model';

export interface DashboardSummary {
  total_employees: number;
  avg_score: number;
  band_counts: { green: number; amber: number; red: number };
  anomaly_count: number;
  top_anomalies: AnomalyAlert[];
  ml_unavailable?: boolean;
}
