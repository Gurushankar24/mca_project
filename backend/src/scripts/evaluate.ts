import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_WINDOW_DAYS } from '../config.js';
import { db } from '../db/connection.js';
import { computeFeatures, getAsOfDate, type EmployeeFeatures } from '../services/features.js';

const FEATURE_NAMES = [
  'avg_checkin_delay',
  'late_count',
  'leaves_taken',
  'weekend_adjacent_leaves',
  'overtime_hrs',
  'absent_days',
] as const;

type FeatureName = (typeof FEATURE_NAMES)[number];
interface Person { id: number; name: string }
interface MlResult { employee_id: number; is_anomaly: boolean }
interface Evaluation {
  method: string;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1: number;
  missed: string[];
  falselyFlagged: string[];
}

function metric(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function evaluate(method: string, flaggedIds: Set<number>, truthIds: Set<number>, peopleById: Map<number, Person>): Evaluation {
  const truePositives = [...flaggedIds].filter((id) => truthIds.has(id)).length;
  const falsePositives = [...flaggedIds].filter((id) => !truthIds.has(id)).length;
  const falseNegatives = [...truthIds].filter((id) => !flaggedIds.has(id)).length;
  const precision = metric(truePositives, truePositives + falsePositives);
  const recall = metric(truePositives, truePositives + falseNegatives);
  const f1 = metric(2 * precision * recall, precision + recall);

  return {
    method,
    truePositives,
    falsePositives,
    falseNegatives,
    precision,
    recall,
    f1,
    missed: [...truthIds].filter((id) => !flaggedIds.has(id)).map((id) => peopleById.get(id)?.name ?? `Employee ${id}`),
    falselyFlagged: [...flaggedIds].filter((id) => !truthIds.has(id)).map((id) => peopleById.get(id)?.name ?? `Employee ${id}`),
  };
}

function populationMean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function populationStd(values: number[], mean: number): number {
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

function format(value: number): string {
  return value.toFixed(3);
}

function markdownList(names: string[]): string {
  return names.length ? names.map((name) => `\`${name}\``).join(', ') : 'None';
}

async function main(): Promise<void> {
  const asOfDate = getAsOfDate();
  if (!asOfDate) throw new Error('No attendance data is available. Run `npm run seed` first.');

  const people = db.prepare(
    `SELECT e.id, e.name FROM employees e JOIN users u ON u.employee_id = e.id
     WHERE e.is_active = 1 AND u.role != 'hr' ORDER BY e.id`,
  ).all() as Person[];
  const features = computeFeatures(people.map((person) => person.id), DEFAULT_WINDOW_DAYS, asOfDate);
  if (features.length < 10) throw new Error(`The Flask service requires at least 10 employees; found ${features.length}.`);

  const truthRows = db.prepare('SELECT employee_id FROM ground_truth ORDER BY employee_id').all() as Array<{ employee_id: number }>;
  const truthIds = new Set(truthRows.map((row) => row.employee_id));
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const mlEmployees = features.map((feature) => ({
    employee_id: feature.employee_id,
    avg_checkin_delay: feature.avg_checkin_delay,
    late_count: feature.late_count,
    leaves_taken: feature.leaves_taken,
    weekend_adjacent_leaves: feature.weekend_adjacent_leaves,
    overtime_hrs: feature.overtime_hrs,
    absent_days: feature.absent_days,
  }));

  const mlUrl = (process.env['ML_SERVICE_URL'] ?? 'http://localhost:5001').replace(/\/$/, '');
  const evaluations: Evaluation[] = [];
  for (const contamination of [0.05, 0.1, 0.15]) {
    let response: Response;
    try {
      response = await fetch(`${mlUrl}/detect-anomalies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contamination, employees: mlEmployees }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new Error(`Could not reach the ML service at ${mlUrl}. Start Flask, then run \`npm run eval\` again.`);
    }
    if (!response.ok) throw new Error(`Flask service returned HTTP ${response.status} for contamination ${contamination}.`);
    const payload = await response.json() as { results?: MlResult[] };
    if (!Array.isArray(payload.results)) throw new Error('Flask service response is missing its results array.');
    const flaggedIds = new Set(payload.results.filter((result) => result.is_anomaly).map((result) => result.employee_id));
    evaluations.push(evaluate(`Isolation Forest (${contamination.toFixed(2)})`, flaggedIds, truthIds, peopleById));
  }

  const valuesByFeature = new Map<FeatureName, number[]>(FEATURE_NAMES.map((name) => [name, features.map((feature) => feature[name])]));
  const stats = new Map<FeatureName, { mean: number; std: number }>();
  for (const name of FEATURE_NAMES) {
    const values = valuesByFeature.get(name)!;
    const mean = populationMean(values);
    stats.set(name, { mean, std: populationStd(values, mean) });
  }
  const baselineIds = new Set<number>();
  for (const feature of features) {
    if (FEATURE_NAMES.some((name) => {
      const { mean, std } = stats.get(name)!;
      return std > 0 && (feature[name] - mean) / std > 2.0;
    })) baselineIds.add(feature.employee_id);
  }
  evaluations.push(evaluate('Z-score baseline', baselineIds, truthIds, peopleById));

  const tableRows = evaluations.map((result) =>
    `| ${result.method} | ${result.truePositives} | ${result.falsePositives} | ${result.falseNegatives} | ${format(result.precision)} | ${format(result.recall)} | ${format(result.f1)} |`,
  );
  const best = [...evaluations].sort((left, right) => right.f1 - left.f1)[0]!;
  const interpretation = `Across ${features.length} active analysed employees and ${truthIds.size} labelled injected anomalies, **${best.method}** had the highest F1 score (${format(best.f1)}). Precision is the share of flags that match injected anomalies; recall is the share of injected anomalies found. These results describe this synthetic dataset and do not establish that a flag indicates wrongdoing.`;
  const details = evaluations.map((result) =>
    `### ${result.method}\n\n- Missed employees: ${markdownList(result.missed)}\n- Falsely flagged employees: ${markdownList(result.falselyFlagged)}`,
  ).join('\n\n');
  const report = `# Anomaly Detection Evaluation\n\nWindow: ${DEFAULT_WINDOW_DAYS} days ending ${asOfDate}.\n\n| Method | True positives | False positives | False negatives | Precision | Recall | F1 |\n|---|---:|---:|---:|---:|---:|---:|\n${tableRows.join('\n')}\n\n${interpretation}\n\n## Missed and falsely flagged employees\n\n${details}\n`;

  console.log(`Evaluation window: ${DEFAULT_WINDOW_DAYS} days ending ${asOfDate}`);
  console.log('| Method | TP | FP | FN | Precision | Recall | F1 |');
  console.log('|---|---:|---:|---:|---:|---:|---:|');
  for (const result of evaluations) {
    console.log(`| ${result.method} | ${result.truePositives} | ${result.falsePositives} | ${result.falseNegatives} | ${format(result.precision)} | ${format(result.recall)} | ${format(result.f1)} |`);
    console.log(`  Missed: ${markdownList(result.missed)}; falsely flagged: ${markdownList(result.falselyFlagged)}`);
  }

  const reportPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs/evaluation_results.md');
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, report, 'utf8');
  console.log(`\nSaved results to ${reportPath}`);
}

await main();
