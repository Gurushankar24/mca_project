export type WellbeingBand = 'green' | 'amber' | 'red';
export type WellbeingFactor = 'attendance' | 'performance' | 'workload' | 'leave';

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
