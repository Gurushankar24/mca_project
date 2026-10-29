import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateWellbeingScore } from './wellbeing.js';

test('worked wellbeing example returns 74 and amber', () => {
  const result = calculateWellbeingScore({ attendance: 0.9, performance: 0.8, workload: 0.5, leave: 0.7 });
  assert.equal(result.score, 74);
  assert.equal(result.band, 'amber');
  assert.equal(result.weakest_factor, 'workload');
  assert.equal(Object.values(result.breakdown).reduce((sum, item) => sum + item.contribution, 0), 74);
});
