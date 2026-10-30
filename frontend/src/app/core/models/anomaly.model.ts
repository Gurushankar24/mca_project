export interface AnomalyReason {
  feature: string;
  text: string;
}

export interface AnomalyAlert {
  employee_id: number;
  name: string;
  department: string;
  severity: number;
  reasons: AnomalyReason[];
}

export interface AnomalyResponse {
  as_of_date: string;
  window_days: number;
  contamination: number;
  total_analysed: number;
  anomalies: AnomalyAlert[];
}
