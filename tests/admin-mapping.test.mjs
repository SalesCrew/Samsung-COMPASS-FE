import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultDatasets,
  defaultSplitCategories,
  mappingFieldsFor,
  suggestColumnMappings,
} from '../app/lib/admin.ts';

test('source-first mapping keeps every workbook column and avoids duplicate suggestions', () => {
  const sheet = {
    name: 'HE Weekly',
    dimension: 'A1:E20',
    rows: 20,
    columns: [
      { key: 'A', label: 'A · HE SEC Monthly Progress' },
      { key: 'B', label: 'B · Store' },
      { key: 'C', label: 'C · SEC' },
      { key: 'D', label: 'D · SEC ID' },
      { key: 'E', label: 'E · TV Units / Achievement' },
    ],
  };
  const mappings = suggestColumnMappings(sheet, 'HE', 'full');
  assert.equal(mappings.length, sheet.columns.length);
  assert.equal(mappings.find(item => item.column === 'B')?.field, 'assignment.store');
  assert.equal(mappings.find(item => item.column === 'D')?.field, 'person.externalId');
  assert.equal(mappings.find(item => item.column === 'E')?.field, 'units.achievement');
  const destinations = mappings.filter(item => item.field).map(item => `${item.dataset}:${item.field}`);
  assert.equal(new Set(destinations).size, destinations.length);
});

test('mapping destinations and split categories follow active role configuration', () => {
  const metrics = [{ id: 'gaming', label: 'Gaming Monitor', unit: 'Stück', weight: 15, target: 40, actual: 36, active: true, block: 'Sell-out' }];
  const fields = mappingFieldsFor('sellout', 'HE', 'full', metrics);
  assert.ok(fields.some(field => field.value === 'gaming.target' && field.label === 'Gaming Monitor · Target'));
  assert.deepEqual(defaultDatasets('MONTH_FINALIZATION', 'Monthly Closing', 'HE'), ['identity', 'assignment', 'snapshot', 'sellout', 'softbonus', 'premium', 'attendance', 'annual']);
  assert.ok(defaultSplitCategories('DA').includes('setting'));
  assert.ok(defaultSplitCategories('LH').includes('block'));
  assert.ok(!defaultSplitCategories('HE').includes('setting'));
});
