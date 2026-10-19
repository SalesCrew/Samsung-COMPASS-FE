import assert from 'node:assert/strict';
import test from 'node:test';
import { groupMetricBlocks, groupKpiOptions, performanceTier, premiumModel, qualitativeMetrics, SEC_GROUPS } from '../app/lib/groups.ts';
import { countFilters, groupDefaultFilters } from '../app/lib/dashboard.ts';

test('source-backed configurations retain per-block weights and explicit missing results', () => {
  for (const group of SEC_GROUPS) {
    for (const setting of ['full', 'laundry-ref', 'vc']) {
      for (const block of groupMetricBlocks(group.id, setting)) {
        assert.equal(block.metrics.reduce((sum, metric) => sum + metric.weight, 0), 100);
        assert.ok(block.metrics.every(metric => !('actual' in metric) && !('achievement' in metric)));
      }
    }
  }
  assert.deepEqual(groupMetricBlocks('DA', 'full')[0].metrics.map(metric => metric.weight), [30, 30, 30, 10]);
  assert.deepEqual(groupMetricBlocks('DA', 'laundry-ref')[0].metrics.map(metric => metric.key), ['laundry', 'ref']);
  assert.deepEqual(groupMetricBlocks('DA', 'vc')[0].metrics.map(metric => metric.weight), [90, 10]);
  assert.equal(groupMetricBlocks('IM')[0].metrics.length, 6);
  assert.deepEqual(groupMetricBlocks('LH').map(block => block.metrics.length), [4, 6]);
  assert.deepEqual(groupMetricBlocks('ST')[0].metrics.map(metric => metric.weight), [35, 25, 15, 25]);
  assert.equal(SEC_GROUPS.find(group => group.id === 'ST').showPointsRules, false);
  assert.ok(qualitativeMetrics('LH').every(metric => metric.weight === null));
});

test('group filters expose only their own criteria and keep independent defaults', () => {
  assert.ok(groupKpiOptions('ST', 'full').every(option => !['units', 'soundbar', 'asp', 'share'].includes(option.value)));
  assert.ok(!groupKpiOptions('DA', 'vc').some(option => option.value === 'laundry'));
  const lhKeys = groupKpiOptions('LH', 'full').map(option => option.value);
  assert.equal(new Set(lhKeys).size, lhKeys.length);
  const st = groupDefaultFilters('ST');
  assert.equal(st.series, 'softbonus');
  assert.equal(countFilters(st, groupDefaultFilters('ST')), 0);
  st.month = '2026-08';
  assert.equal(groupDefaultFilters('HE').month, '2026-09');
});

test('medal colors follow the supplied monthly rules without inventing the mixed case', () => {
  assert.equal(performanceTier('HE', 98, 100), 'gold');
  assert.equal(performanceTier('DA', 92, 94), 'silver');
  assert.equal(performanceTier('IM', 88, 89), 'bronze');
  assert.equal(performanceTier('LH', 94, 85), 'unresolved');
  assert.equal(performanceTier('HE', null, 100), 'unavailable');
  assert.equal(performanceTier('ST', null, 96), 'gold');
  assert.equal(premiumModel('LH').detail, 'Leistung: 50% HE · 50% IM');
  assert.equal(premiumModel('ST').formula, '100% Softbonus');
  assert.equal(premiumModel('ST').hasOnTop, false);
  assert.match(premiumModel('ST').detail, /Geldfreigabe offen/);
});
