import test from 'node:test';
import assert from 'node:assert/strict';
import { average, dashboardResults, dashboardTrend, DEFAULT_DASHBOARD_SCOPE } from '../app/lib/adminDashboard.ts';

test('admin dashboard filters the same fictional cohort across group, market and focus', () => {
  const all = dashboardResults(DEFAULT_DASHBOARD_SCOPE);
  assert.equal(all.length, 23);
  assert.equal(all.filter(item => item.person.group === 'ST').length, 1);
  const scoped = dashboardResults({ ...DEFAULT_DASHBOARD_SCOPE, group: 'HE', market: 'Demo Nord' });
  assert.equal(scoped.length, 2);
  assert.ok(scoped.every(item => item.person.group === 'HE' && item.person.market === 'Demo Nord'));
  const focused = dashboardResults({ ...DEFAULT_DASHBOARD_SCOPE, focus: 'on-track' });
  assert.ok(focused.length > 0 && focused.length < all.length);
  assert.ok(focused.every(item => item.achievement >= 95 && item.softbonus >= 95));
  assert.equal(dashboardResults({ ...DEFAULT_DASHBOARD_SCOPE, focus: 'model-open' }).length, 1);
});

test('ST cannot enter comparative achievement or fictional premium totals', () => {
  const st = dashboardResults({ ...DEFAULT_DASHBOARD_SCOPE, group: 'ST' });
  assert.equal(st.length, 1);
  assert.equal(st[0].achievement, null);
  assert.equal(st[0].premium, null);
  assert.equal(average(st.map(item => item.achievement)), null);
});

test('snapshot and month filters alter results without adding weekly values', () => {
  const latest = dashboardResults({ ...DEFAULT_DASHBOARD_SCOPE, group: 'HE' });
  const earlier = dashboardResults({ ...DEFAULT_DASHBOARD_SCOPE, group: 'HE', snapshot: '2026-09-16' });
  const august = dashboardResults({ ...DEFAULT_DASHBOARD_SCOPE, group: 'HE', month: '2026-08' });
  assert.equal(latest.length, earlier.length);
  assert.equal(latest.length, august.length);
  assert.ok(earlier[0].achievement < latest[0].achievement);
  assert.ok(august[0].premium < latest[0].premium);
  assert.equal(dashboardTrend(DEFAULT_DASHBOARD_SCOPE).length, 6);
  assert.equal(dashboardTrend({ ...DEFAULT_DASHBOARD_SCOPE, month: '2026-08' }).length, 5);
});
