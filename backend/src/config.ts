export const DEFAULT_WINDOW_DAYS = Number(process.env['DEFAULT_WINDOW_DAYS'] ?? 30);

export const WELLBEING_WEIGHTS = {
  attendance: 0.30,
  performance: 0.30,
  workload: 0.25,
  leave: 0.15,
} as const;
