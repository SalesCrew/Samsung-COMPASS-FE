import test from 'node:test';
import assert from 'node:assert/strict';
import { closingDefinitions, closingMappings, mergeClosingMappings, closingTemplate, closingMappingError, mappingConflicts, prepareClosing, excelMonth, detectClosingGroup } from '../app/lib/closingImport.ts';
import { preferredSheet } from '../app/lib/workbook.ts';

const value = value => ({ kind: 'value', value });
function fixture(group = 'HE') {
  const sheet = closingTemplate(group);
  sheet.data = [{ row: 3, cells: { A: value('DEMO-1-NORD'), B: value('DEMO-1'), D: value('Demo Nord'), M: value('2026-08-01'), U: value(0), Y: value(0.98), AE: value(100) } }];
  return sheet;
}

test('all five original Pivot layouts have unique source-backed fields and percentage KPI mappings', () => {
  for (const [group, count] of Object.entries({ DA: 35, HE: 36, IM: 38, LH: 45, ST: 32 })) {
    const sheet = closingTemplate(group);
    const definitions = closingDefinitions(group);
    const mappings = closingMappings(sheet, group);
    assert.equal(definitions.length, count);
    assert.equal(new Set(definitions.map(item => item.field)).size, count, group);
    assert.equal(closingMappingError(sheet, group, mappings), '');
    assert.equal(mappings.find(item => item.id === `${group}:B`).sourceLabel, 'SEC ID');
    assert.equal(mappings.find(item => item.id === `${group}:B`).column, 'B');
    assert.ok(mappings.filter(item => item.dataset === 'sellout').every(item => item.dataType === 'percent'));
    assert.ok(!mappings.some(item => /\.target$|\.actual$/.test(item.field)));
    assert.equal(mappings.find(item => item.sourceLabel === 'Gehalt').dataset, 'ignore');
    if (group === 'ST') assert.ok(!mappings.some(item => item.dataset === 'sellout'));
  }
});

test('B to A flags both active rows and blocks import until conflict is resolved', () => {
  const sheet = fixture();
  const mappings = closingMappings(sheet, 'HE');
  const sec = mappings.find(item => item.id === 'HE:B');
  sec.column = 'A';
  assert.deepEqual(mappingConflicts(mappings).get('A'), ['SEC+Shop ID', 'SEC ID']);
  assert.match(closingMappingError(sheet, 'HE', mappings), /Spaltenkonflikt.*A/);
  assert.equal(prepareClosing(sheet, 'HE', mappings, '2026-08').records.length, 0);
  mappings.find(item => item.id === 'HE:A').dataset = 'ignore';
  assert.equal(closingMappingError(sheet, 'HE', mappings), '');
  assert.equal(prepareClosing(sheet, 'HE', mappings, '2026-08').records[0].fields['person.externalId'].value, 'DEMO-1-NORD');
});

test('prefill follows original header names when columns move and never silently guesses a missing field', () => {
  const sheet = fixture();
  [sheet.columns[0].label, sheet.columns[1].label] = [sheet.columns[1].label, sheet.columns[0].label];
  const mappings = closingMappings(sheet, 'HE');
  assert.equal(mappings.find(item => item.id === 'HE:B').column, 'A');
  assert.equal(mappings.find(item => item.id === 'HE:A').column, 'B');
  sheet.columns[0].label = 'Unknown ID';
  const missing = closingMappings(sheet, 'HE');
  assert.equal(missing.find(item => item.id === 'HE:B').column, '');
  assert.match(closingMappingError(sheet, 'HE', missing), /Pflichtfelder fehlen.*SEC ID/);
});

test('monthly import skips rolling history and totals while retaining zero, blank and x', () => {
  const sheet = fixture();
  sheet.data[0].cells.N = value('x');
  sheet.data[0].cells.Y = value('98,5%');
  sheet.data.push({ row: 4, cells: { B: value('DEMO-1'), D: value('Demo Nord'), M: value('2026-07-01') } });
  sheet.data.push({ row: 5, cells: { M: value(13) } });
  sheet.data.push({ row: 6, cells: Object.fromEntries(Array.from({length:13}, (_,index) => [String.fromCharCode(65+index),value(index+1)])) });
  const result = prepareClosing(sheet, 'HE', closingMappings(sheet, 'HE'), '2026-08');
  assert.equal(result.records.length, 1);
  assert.equal(result.otherMonths, 1);
  assert.equal(result.skipped, 2);
  assert.equal(result.specialValues, 1);
  assert.deepEqual(result.issues, []);
  assert.equal(result.records[0].fields['softbonus.overall'].value, 0);
  assert.equal(result.records[0].fields['softbonus.wissenstest'].value, 'x');
  assert.equal(result.records[0].fields['units.achievement'].value, 0.985);
  assert.equal(result.records[0].fields['premium.maximum'].kind, 'blank');
});

test('Excel errors, missing formula caches, missing identities and duplicate rows block the result', () => {
  for (const cell of [{ kind: 'error', value: '#REF!' }, { kind: 'uncached-formula', value: null }]) {
    const sheet = fixture(); sheet.data[0].cells.Y = cell;
    assert.match(prepareClosing(sheet, 'HE', closingMappings(sheet, 'HE'), '2026-08').issues[0].message, /Excel-Fehler|Formel ohne/);
  }
  const sheet = fixture(); sheet.data.push(structuredClone({ ...sheet.data[0], row: 4 }));
  assert.match(prepareClosing(sheet, 'HE', closingMappings(sheet, 'HE'), '2026-08').issues[0].message, /Doppelter/);
  sheet.data[0].cells.B = value(''); sheet.data.pop();
  assert.match(prepareClosing(sheet, 'HE', closingMappings(sheet, 'HE'), '2026-08').issues[0].message, /SEC ID.*Pflichtwert/);
  sheet.data[0].cells.D = value('');
  assert.equal(prepareClosing(sheet, 'HE', closingMappings(sheet, 'HE'), '2026-08').issues.filter(item => /Pflichtwert/.test(item.message)).length, 2);
});

test('workbook selection prefers Pivot Liste and source HA is detected as app DA', () => {
  const pivot = fixture('DA');
  assert.equal(preferredSheet([{ name: 'MC' }, pivot]), pivot);
  assert.equal(preferredSheet([{ name: 'MC' }, { name: 'Pivotliste' }]).name, 'Pivotliste');
  assert.equal(detectClosingGroup('HA MonthlyClosing 08_2026_von Samsung.xlsm', pivot), 'DA');
  assert.equal(detectClosingGroup('renamed.xlsm', fixture('LH')), 'LH');
  assert.equal(excelMonth(46235), '2026-08');
  assert.equal(excelMonth(13), undefined);
  assert.equal(excelMonth('2026-13'), undefined);
});

test('custom KPI and Softbonus configuration names start unassigned even when a header has the same name', () => {
  const sheet = fixture();
  const metrics = [
    { id: 'custom-kpi', label: 'Mein KPI', active: true, block: 'HE Sell-out', dataset: 'sellout' },
    { id: 'custom-soft', label: 'Mein Softbonus', active: true, block: 'Softbonus', dataset: 'softbonus' },
    { id: 'inactive', label: 'Inactive', active: false, block: 'HE Sell-out' },
  ];
  sheet.columns.push({ key: 'AK', label: 'Mein KPI' }, { key: 'AL', label: 'Mein Softbonus' });
  const mappings = closingMappings(sheet, 'HE', metrics);
  const kpi = mappings.find(item => item.sourceLabel === 'Mein KPI');
  const soft = mappings.find(item => item.sourceLabel === 'Mein Softbonus');
  assert.equal(kpi.column, ''); assert.equal(soft.column, '');
  assert.ok(!mappings.some(item => item.sourceLabel === 'Inactive'));
  assert.match(closingMappingError(sheet, 'HE', mappings, metrics), /Mein KPI.*Mein Softbonus/);
  kpi.column = 'AK'; soft.column = 'AL';
  sheet.data[0].cells.AK = value(0.91); sheet.data[0].cells.AL = value(0.99);
  const result = prepareClosing(sheet, 'HE', mappings, '2026-08', metrics);
  assert.deepEqual(result.issues, []);
  assert.equal(result.records[0].fields['custom-kpi.achievement'].value, 0.91);
  assert.equal(result.records[0].fields['softbonus.config.custom-soft.achievement'].value, 0.99);
  metrics[0].label = 'Umbenannter KPI';
  const merged = mergeClosingMappings(sheet, 'HE', metrics, mappings);
  assert.equal(merged.find(item => item.field === kpi.field).column, 'AK');
  assert.equal(merged.find(item => item.field === kpi.field).sourceLabel, 'Umbenannter KPI');
});
