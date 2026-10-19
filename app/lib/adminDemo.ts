import { defaultDatasets, defaultSplitCategories, IMPORT_DATASETS, initialMetrics, type ConfigVersion, type ImportPhase, type ImportVersion, type SheetPreview, type SourceColumnMapping } from './admin.ts';
import { DA_SETTINGS, SEC_GROUPS, type DASetting, type SECGroup } from './groups.ts';

/** Entirely fictional meeting fixtures. Never derived from employee workbook rows. */
export type MeetingPerson = { id: string; market: string; group: SECGroup['id']; shift: number };
export const MEETING_PEOPLE: MeetingPerson[] = SEC_GROUPS.flatMap((group, groupIndex) =>
  Array.from({ length: group.id === 'LH' ? 4 : group.id === 'ST' ? 1 : 6 }, (_, index) => ({
    id: `DEMO ${String(groupIndex * 10 + index + 1).padStart(3, '0')}`,
    market: ['Demo Nord', 'Demo Mitte', 'Demo Süd'][index % 3],
    group: group.id,
    shift: [0, -8, 4, -3, 6, -12][index],
  })),
);

export const MEETING_CONFIGS: ConfigVersion[] = SEC_GROUPS.flatMap(group =>
  (group.id === 'DA' ? DA_SETTINGS.map(item => item.value) : ['full' as const]).map(setting => ({
    id: `meeting-config-${group.id}-${setting}`,
    origin: 'meeting-demo' as const,
    group: group.id, setting, effective: '2026-09-01', saved: '2026-09-01T08:00:00Z',
    note: group.id === 'ST' ? 'Demomodell: qualitative Kriterien. Geld- und Jahresmodell bleiben offen.'
      : group.id === 'LH' ? 'Demomodell: getrennte HE-/IM-Blöcke. Softbonus-Untergewichte bleiben offen.'
        : 'Demomodell: bestehende Quellengewichte, frei erfundene Ziel-/Istwerte.',
    metrics: initialMetrics(group.id, setting),
  })),
);
MEETING_CONFIGS.push({
  ...MEETING_CONFIGS[0], id: 'meeting-config-HE-review', saved: '2026-09-15T08:00:00Z',
  effective: '2026-09-15', note: 'Demokorrektur: TV-Units-Ziel von 50 auf 55. Gewichte unverändert.',
  metrics: MEETING_CONFIGS[0].metrics.map(metric => ({ ...metric, target: metric.id === 'units' ? 55 : metric.target })),
});

export function meetingWorkbook(group: SECGroup['id'] = 'HE', setting: DASetting = 'full', phase: ImportPhase = 'WEEKLY_PROGRESS') {
  const metrics = initialMetrics(group, setting);
  const definitions: Omit<SourceColumnMapping, 'column'>[] = [
    { sourceLabel: 'Demo SEC-ID', dataset: 'identity', field: 'person.externalId', dataType: 'text', required: true },
    { sourceLabel: 'Demo Markt', dataset: 'assignment', field: 'assignment.market', dataType: 'text', required: true },
    { sourceLabel: 'Stichtag', dataset: 'snapshot', field: 'snapshot.dataDate', dataType: 'date', required: false },
    ...metrics.flatMap<Omit<SourceColumnMapping, 'column'>>(metric => group === 'ST' ? [{
      sourceLabel: `${metric.label} Bewertung`, dataset: 'softbonus' as const, field: `${metric.id}.${phase === 'TARGET_INITIALIZATION' ? 'target' : 'actual'}`, dataType: 'percent' as const, required: false,
    }] : [
      { sourceLabel: `${metric.label} Target`, dataset: 'sellout' as const, field: `${metric.id}.target`, dataType: 'number' as const, required: false },
      ...(phase === 'TARGET_INITIALIZATION' ? [] : [{ sourceLabel: `${metric.label} Ist MTD`, dataset: 'sellout' as const, field: `${metric.id}.actual`, dataType: 'number' as const, required: false }]),
    ]),
    ...(phase === 'MONTH_FINALIZATION' ? [
      { sourceLabel: 'Softbonus Gesamt', dataset: 'softbonus' as const, field: 'softbonus.overall', dataType: 'percent' as const, required: false },
      { sourceLabel: 'Attendance', dataset: 'attendance' as const, field: 'attendance.rate', dataType: 'percent' as const, required: false },
      ...(group === 'ST' ? [] : [
        { sourceLabel: 'Erreichte Prämie', dataset: 'premium' as const, field: 'premium.achieved', dataType: 'currency' as const, required: false },
        { sourceLabel: 'Jahrespunkte', dataset: 'annual' as const, field: 'annual.points', dataType: 'number' as const, required: false },
      ]),
    ] : []),
  ];
  const columnKey = (index: number) => index < 26 ? String.fromCharCode(65 + index) : `A${String.fromCharCode(65 + index - 26)}`;
  const mappings: SourceColumnMapping[] = definitions.map((item, index) => ({ ...item, column: columnKey(index) }));
  const sheet: SheetPreview = { name: `${group} Demo Progress`, dimension: `A1:${columnKey(mappings.length - 1)}${MEETING_PEOPLE.filter(person => person.group === group).length + 1}`, rows: MEETING_PEOPLE.filter(person => person.group === group).length + 1, columns: mappings.map(item => ({ key: item.column, label: item.sourceLabel })) };
  return { sheet, mappings, filename: `DEMO_${group}_2026-09.xlsx` };
}

function snapshot(group: SECGroup['id'], month: string, day: string, phase: ImportPhase): ImportVersion {
  const subtype = phase === 'MONTH_FINALIZATION' ? 'Monthly Closing' : phase === 'TARGET_INITIALIZATION' ? 'Targetliste' : 'Progress-Tracker';
  const source = meetingWorkbook(group, 'full', phase);
  // No unconfirmed money or annual-point datasets for ST.
  const datasets = defaultDatasets(phase, subtype, group).filter(dataset => group !== 'ST' || !['premium', 'annual'].includes(dataset));
  return {
    id: `meeting-import-${group}-${day}`, origin: 'meeting-demo', filename: `DEMO_${group}_${day}_${subtype.replaceAll(' ', '-')}.xlsx`,
    group, month, phase, subtype, sheet: source.sheet.name, saved: `${day}T09:00:00Z`, status: 'released',
    fields: source.mappings.map(item => `${item.column} → ${item.dataset}.${item.field}`),
    mapping: Object.fromEntries(source.mappings.map(item => [item.column, `${item.dataset}.${item.field}`])),
    columnMappings: source.mappings, datasets, splitCategories: defaultSplitCategories(group),
    changed: datasets.map(dataset => IMPORT_DATASETS.find(item => item.id === dataset)!.label),
    carried: phase === 'WEEKLY_PROGRESS' ? ['Zielbasis vom Monatsstart; MTD-Snapshot ersetzt den vorherigen Stand'] : [],
  };
}

export const MEETING_IMPORTS: ImportVersion[] = [
  snapshot('HE', '2026-08', '2026-09-02', 'MONTH_FINALIZATION'),
  ...SEC_GROUPS.map(group => snapshot(group.id, '2026-09', '2026-09-03', 'TARGET_INITIALIZATION')),
  snapshot('HE', '2026-09', '2026-09-16', 'WEEKLY_PROGRESS'),
  ...SEC_GROUPS.map(group => snapshot(group.id, '2026-09', '2026-09-24', 'WEEKLY_PROGRESS')),
];

/** Seeds stay in memory. Existing browser records take precedence and are not reset. */
export function mergeMeetingData<T extends { id: string; origin?: string }>(seeds: T[], saved: T[]): T[] {
  const local = saved.filter(item => item.origin !== 'meeting-demo');
  const ids = new Set(local.map(item => item.id));
  return [...structuredClone(seeds.filter(item => !ids.has(item.id))), ...local];
}

export function localRecords<T extends { origin?: string }>(records: T[]): T[] {
  return records.filter(item => item.origin !== 'meeting-demo');
}
