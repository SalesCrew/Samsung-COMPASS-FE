import test from 'node:test';
import assert from 'node:assert/strict';
import { MEETING_CONFIGS, MEETING_IMPORTS, MEETING_PEOPLE, meetingWorkbook, mergeMeetingData, localRecords } from '../app/lib/adminDemo.ts';
import { mappingFieldsFor, weightChecks } from '../app/lib/admin.ts';

test('meeting fixtures cover all roles without copying employee identities', () => {
  assert.equal(MEETING_PEOPLE.length, 23);
  assert.equal(new Set(MEETING_PEOPLE.map(person => person.id)).size, 23);
  assert.equal(MEETING_PEOPLE.filter(person => person.group === 'LH').length, 4);
  assert.equal(MEETING_PEOPLE.filter(person => person.group === 'ST').length, 1);
  assert.ok(MEETING_PEOPLE.every(person => person.id.startsWith('DEMO ') && person.market.startsWith('Demo ')));
  assert.equal(MEETING_CONFIGS.length, 8);
  assert.equal(MEETING_IMPORTS.length, 12);
  assert.deepEqual(new Set(MEETING_CONFIGS.map(item => item.group)), new Set(['HE', 'DA', 'IM', 'LH', 'ST']));
  for (const config of MEETING_CONFIGS) {
    assert.equal(config.origin, 'meeting-demo');
    assert.ok(weightChecks(config.metrics).every(check => check.total === 100 && !check.unresolved));
  }
  for (const item of MEETING_IMPORTS) {
    assert.equal(item.origin, 'meeting-demo');
    assert.ok(item.filename.startsWith('DEMO_'));
    if (item.group === 'ST') assert.ok(!item.datasets.includes('premium') && !item.datasets.includes('annual'));
  }
});

test('sample import contracts use real destination fields for each role and phase', () => {
  for (const group of ['HE', 'DA', 'IM', 'LH', 'ST']) {
    for (const phase of ['TARGET_INITIALIZATION', 'WEEKLY_PROGRESS', 'MONTH_FINALIZATION']) {
      const { sheet, mappings } = meetingWorkbook(group, 'full', phase);
      assert.equal(sheet.columns.length, mappings.length);
      assert.equal(new Set(mappings.map(item => `${item.dataset}.${item.field}`)).size, mappings.length);
      for (const item of mappings) {
        assert.ok(mappingFieldsFor(item.dataset, group, 'full').some(field => field.value === item.field), `${group}: ${item.dataset}.${item.field}`);
      }
      if (phase === 'TARGET_INITIALIZATION') assert.ok(!mappings.some(item => /\.actual$/.test(item.field)));
      if (group === 'ST') assert.ok(!mappings.some(item => ['premium', 'annual', 'sellout'].includes(item.dataset)));
    }
  }
});

test('demo seeds do not overwrite or enter persisted local versions', () => {
  const original = { id: 'user-config', group: 'HE', metrics: [{ label: 'User metric' }] };
  const merged = mergeMeetingData(MEETING_CONFIGS, [original]);
  assert.deepEqual(merged.at(-1), original);
  assert.deepEqual(localRecords(merged), [original]);
  merged[0].metrics[0].label = 'Changed in this view';
  assert.notEqual(MEETING_CONFIGS[0].metrics[0].label, 'Changed in this view');
  assert.equal(mergeMeetingData(MEETING_CONFIGS, MEETING_CONFIGS).length, MEETING_CONFIGS.length);
});

test('sample target correction retains the original configuration and weights', () => {
  const versions = MEETING_CONFIGS.filter(item => item.group === 'HE');
  assert.equal(versions[0].metrics.find(item => item.id === 'units').target, 50);
  assert.equal(versions[1].metrics.find(item => item.id === 'units').target, 55);
  assert.deepEqual(versions[0].metrics.map(item => item.weight), versions[1].metrics.map(item => item.weight));
});
