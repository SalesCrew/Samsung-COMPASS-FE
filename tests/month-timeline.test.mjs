import assert from 'node:assert/strict';
import test from 'node:test';
import { monthTimeline } from '../app/lib/dashboard.ts';

test('month timeline runs from the first to the actual last day', () => {
  assert.deepEqual(monthTimeline('2026-09', '2026-09-01'), { lastDay: 30, day: 1, progress: 0 });
  assert.deepEqual(monthTimeline('2026-09', '2026-09-30'), { lastDay: 30, day: 30, progress: 100 });
  assert.equal(monthTimeline('2026-09', '2026-09-24').progress, 23 / 29 * 100);
  assert.deepEqual(monthTimeline('2026-02', '2026-02-28'), { lastDay: 28, day: 28, progress: 100 });
});

test('timeline clamps a data cutoff outside the selected month', () => {
  assert.equal(monthTimeline('2026-09', '2026-08-31').progress, 0);
  assert.equal(monthTimeline('2026-09', '2026-10-01').progress, 100);
});
