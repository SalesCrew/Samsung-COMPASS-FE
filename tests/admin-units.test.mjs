import test from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_METRIC_UNITS, adminMetricUnitOptions } from '../app/lib/adminUnits.ts';
import { initialMetrics } from '../app/lib/admin.ts';
import { MEETING_CONFIGS } from '../app/lib/adminDemo.ts';

test('unit catalog uses canonical values for every group and saved demo model', () => {
  assert.deepEqual(ADMIN_METRIC_UNITS.map(unit => unit.value), ['Stück', '€', '%']);
  assert.equal(new Set(ADMIN_METRIC_UNITS.map(unit => unit.code)).size, 3);
  for (const group of ['HE', 'DA', 'IM', 'LH', 'ST']) {
    for (const metric of initialMetrics(group, 'full')) {
      assert.ok(ADMIN_METRIC_UNITS.some(unit => unit.value === metric.unit));
      assert.equal(adminMetricUnitOptions(metric.unit).length, 3);
    }
  }
  assert.ok(MEETING_CONFIGS.every(config => config.metrics.every(metric => ADMIN_METRIC_UNITS.some(unit => unit.value === metric.unit))));
});

test('historical free-text units remain visible without becoming new selectable units', () => {
  const oldUnit = 'EUR / Stunde';
  const options = adminMetricUnitOptions(oldUnit);
  assert.equal(options[0].value, oldUnit);
  assert.equal(options[0].label, oldUnit);
  assert.equal(options[0].disabled, true);
  assert.deepEqual(options.filter(option => !option.disabled).map(option => option.value), ['Stück', '€', '%']);
  assert.equal(adminMetricUnitOptions('')[0].label, 'Keine Einheit');
  assert.deepEqual(ADMIN_METRIC_UNITS.map(unit => unit.value), ['Stück', '€', '%']);
});
