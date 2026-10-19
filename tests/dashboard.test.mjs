import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_FILTERS, cutoff, historyRows, monthlyView, matchesKpi, snapshotUpdates,
  activeDashboardSection, snapshotOptions,
} from '../app/lib/dashboard.ts';

const filters = changes => ({ ...DEFAULT_FILTERS, ...changes });

test('month and selected snapshot define the cutoff without a swipe-period preset', () => {
  assert.equal(cutoff(filters({})), '2026-09-24');
  assert.equal(cutoff(filters({ snapshot: '2026-09-16' })), '2026-09-16');
  assert.equal(cutoff(filters({ month: '2026-04' })), '2026-04-30');
  assert.equal('period' in DEFAULT_FILTERS, false);
});

test('history filters intersect month, snapshot cutoff and status without summing MTD snapshots', () => {
  assert.equal(historyRows(filters({})).length, 6);
  assert.deepEqual(historyRows(filters({ month: '2026-07' })).map(row => row.short), ['Apr', 'Mai', 'Jun', 'Jul']);
  assert.equal(historyRows(filters({ status: 'final' })).length, 5);
  assert.equal(historyRows(filters({ snapshot: '2026-09-16' })).some(row => row.id === '2026-09'), false);
  assert.equal(historyRows(filters({ status: 'targets' })).length, 0);
});

test('target-only and unavailable states do not leak the current month actuals', () => {
  const target = monthlyView(filters({ snapshot: '2026-09-01', status: 'targets' }));
  assert.equal(target.targetOnly, true);
  assert.equal(target.overall, null);
  assert.equal(target.hasDetails, false);
  assert.equal(target.annualAvailable, false);
  const unmatched = monthlyView(filters({ status: 'final' }));
  assert.equal(unmatched.available, false);
  assert.equal(unmatched.overall, null);
  assert.equal(unmatched.hasDetails, false);
  const earlier = monthlyView(filters({ month: '2026-08' }));
  assert.equal(earlier.overall, null);
  assert.equal(earlier.hasDetails, false);
  assert.equal(monthlyView(filters({ snapshot: '2026-09-16' })).overall, 93.8);
  assert.equal(snapshotOptions('2026-08').length, 1);
});

test('comparison and KPI focus do not alter totals or invent missing baselines', () => {
  assert.equal(monthlyView(filters({})).delta, 4.2);
  assert.equal(monthlyView(filters({ comparison: 'month' })).delta, null);
  assert.equal(monthlyView(filters({ comparison: 'none' })).delta, null);
  assert.equal(monthlyView(filters({ kpi: 'share' })).overall, 98);
  assert.equal(matchesKpi('share', filters({ kpi: 'below' })), true);
  assert.equal(matchesKpi('units', filters({ kpi: 'below' })), false);
});

test('update notifications distinguish freshly delivered from carried fields', () => {
  const updates = snapshotUpdates('HE', '2026-09');
  assert.deepEqual(updates.map(item => item.date), ['2026-09-01', '2026-09-16', '2026-09-24']);
  assert.ok(updates[2].changed.includes('Targetkorrektur'));
  assert.ok(updates[2].carried.includes('Softbonus'));
  assert.ok(snapshotUpdates('ST', '2026-09')[2].changed.includes('Kriterienstand'));
});

test('dock tracks actual scroll in both directions with no post-click lock', () => {
  const anchors = [{ key: 'home', top: 0 }, { key: 'trend', top: 675 }, { key: 'category', top: 1224 }, { key: 'monthly', top: 1503 }];
  const downward = [0, 675, 1224, 1503].map(top => activeDashboardSection(top, anchors));
  assert.deepEqual(downward, ['home', 'trend', 'category', 'monthly']);
  assert.deepEqual([1503, 1224, 675, 0].map(top => activeDashboardSection(top, anchors)), [...downward].reverse());
  assert.equal(activeDashboardSection(630, anchors), 'trend');
  assert.equal(activeDashboardSection(600, anchors), 'home');
});
