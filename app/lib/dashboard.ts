// Anonymous illustration data from the accepted UI. These are not imported SEC records.
export type DataStatus = 'all' | 'preliminary' | 'final' | 'targets';
// KPI keys are supplied by the selected group's source-backed configuration.
export type KpiFocus = string;
export type DashboardFilters = {
  month: string;
  snapshot: string;
  status: DataStatus;
  comparison: 'previous' | 'month' | 'none';
  series: 'both' | 'sellout' | 'softbonus';
  kpi: KpiFocus;
  daSetting: 'full' | 'laundry-ref' | 'vc';
};
export const DEMO_AS_OF = '2026-09-24';
export const DEFAULT_FILTERS: DashboardFilters = {
  month: '2026-09',
  snapshot: 'latest', status: 'all', comparison: 'previous', series: 'both', kpi: 'all', daSetting: 'full',
};
export function groupDefaultFilters(group: string): DashboardFilters {
  return { ...DEFAULT_FILTERS, series: group === 'ST' ? 'softbonus' : 'both' };
}
export const MONTHS = [
  { id: '2026-04', label: 'April', short: 'Apr', sellout: 88, softbonus: 94 },
  { id: '2026-05', label: 'Mai', short: 'Mai', sellout: 92, softbonus: 96 },
  { id: '2026-06', label: 'Juni', short: 'Jun', sellout: 89, softbonus: 93 },
  { id: '2026-07', label: 'Juli', short: 'Jul', sellout: 94, softbonus: 100 },
  { id: '2026-08', label: 'August', short: 'Aug', sellout: 88, softbonus: 96 },
  { id: '2026-09', label: 'September', short: 'Sep', sellout: 98, softbonus: 100 },
];
export const KPI_OPTIONS: { value: KpiFocus; label: string }[] = [
  { value: 'all', label: 'Alle KPIs' }, { value: 'below', label: 'Unter 100 %' },
  { value: 'units', label: 'TV Units' }, { value: 'soundbar', label: 'Soundbar' },
  { value: 'asp', label: 'TV ASP' }, { value: 'share', label: 'In-house Share' },
];
export const STATUS_LABELS = { all: 'Alle Datenstände', preliminary: 'Vorläufig', final: 'Final', targets: 'Nur Targets' };
const date = (value: string) => new Date(`${value}T00:00:00Z`);
const iso = (value: Date) => value.toISOString().slice(0, 10);
export function endOfMonth(month: string) {
  const d = date(`${month}-01`);
  return iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
}
export function monthTimeline(month: string, asOf: string) {
  const monthEnd = endOfMonth(month);
  const lastDay = Number(monthEnd.slice(-2));
  const day = asOf < `${month}-01` ? 1 : asOf > monthEnd ? lastDay : Number(asOf.slice(-2));
  return { lastDay, day, progress: (day - 1) / (lastDay - 1) * 100 };
}
export function snapshotOptions(month: string) {
  return month === '2026-09' ? [
    { value: 'latest', label: 'Neuester Stand · 24.09.' },
    { value: '2026-09-16', label: '16.09. · Wochenstand' },
    { value: '2026-09-01', label: '01.09. · Targetbasis' },
  ] : [{ value: 'latest', label: `${shortDate(endOfMonth(month))} · Monatsabschluss` }];
}
export function cutoff(filters: DashboardFilters) {
  return filters.month === '2026-09'
    ? filters.snapshot === 'latest' ? DEMO_AS_OF : filters.snapshot
    : endOfMonth(filters.month);
}
export function shortDate(value: string) {
  return `${value.slice(8, 10)}.${value.slice(5, 7)}.`;
}
export function countFilters(filters: DashboardFilters, defaults: DashboardFilters = DEFAULT_FILTERS) {
  return (Object.keys(DEFAULT_FILTERS) as (keyof DashboardFilters)[])
    .filter(key => filters[key] !== defaults[key]).length;
}
export function matchesStatus(status: Exclude<DataStatus, 'all'>, filters: DashboardFilters) {
  return filters.status === 'all' || filters.status === status;
}
export function historyRows(filters: DashboardFilters) {
  const asOf = cutoff(filters);
  return MONTHS.map(month => ({ ...month,
    date: month.id === '2026-09' ? DEMO_AS_OF : endOfMonth(month.id),
    status: (month.id === '2026-09' ? 'preliminary' : 'final') as Exclude<DataStatus, 'all'>,
  })).filter(row => row.date <= asOf && matchesStatus(row.status, filters));
}
export type SnapshotUpdate = { date: string; phase: string; status: DataStatus; changed: string[]; carried: string[]; note: string };
export function snapshotUpdates(group: string, month: string): SnapshotUpdate[] {
  if (month !== '2026-09') return [{ date: endOfMonth(month), phase: 'Monatsabschluss', status: 'final', changed: ['Sell-out', 'Softbonus', 'Prämie'], carried: [], note: 'Alle freigegebenen Werte dieses Monats.' }];
  return [
    { date: '2026-09-01', phase: 'Targetbasis', status: 'targets', changed: ['Monatsziele', 'Marktzuordnung'], carried: [], note: 'Noch keine gemessenen Istwerte.' },
    { date: '2026-09-16', phase: 'Weekly Progress', status: 'preliminary', changed: group === 'ST' ? ['Kriterienstand'] : ['Sell-out', 'KPI-Istwerte'], carried: ['Softbonus', 'Prämie'], note: 'Kumulativer Monatsstand, keine einzelne Woche.' },
    { date: '2026-09-24', phase: 'Weekly Progress', status: 'preliminary', changed: group === 'ST' ? ['Kriterienstand'] : ['Sell-out', 'KPI-Istwerte', 'Targetkorrektur'], carried: ['Softbonus', 'Prämie'], note: 'Unveränderte Felder bleiben beim letzten freigegebenen Stand.' },
  ];
}
export function monthlyView(filters: DashboardFilters) {
  const asOf = cutoff(filters);
  const status: Exclude<DataStatus, 'all'> = filters.month !== '2026-09' ? 'final' : asOf.endsWith('-01') ? 'targets' : 'preliminary';
  const available = matchesStatus(status, filters);
  const isCurrent = filters.month === '2026-09' && filters.snapshot === 'latest';
  // Previous demo summary only; no made-up historical KPI actuals or annual points.
  const overall = !available ? null : isCurrent ? 98 : asOf === '2026-09-16' ? 93.8 : null;
  return {
    asOf, status, available, overall,
    hasDetails: available && isCurrent,
    targetOnly: available && status === 'targets',
    delta: isCurrent && available && filters.comparison === 'previous' ? 4.2 : null,
    annualAvailable: available && isCurrent,
    monthLabel: MONTHS.find(month => month.id === filters.month)?.label ?? filters.month,
    comparisonLabel: filters.comparison === 'previous' ? 'zur Vorwoche' : filters.comparison === 'month' ? 'zum Vormonat' : 'Vergleich aus',
  };
}
export function matchesKpi(key: Exclude<KpiFocus, 'all' | 'below'>, filters: DashboardFilters) {
  return filters.kpi === 'all' || filters.kpi === key || (filters.kpi === 'below' && (key === 'soundbar' || key === 'share'));
}
export type DashboardSection = 'home' | 'trend' | 'monthly' | 'category' | 'targets';
export const SECTION_ANCHORS: { key: DashboardSection; id: string; offset: number }[] = [
  { key: 'home', id: 'section-home', offset: 0 },
  { key: 'trend', id: 'section-trend', offset: 116 },
  { key: 'category', id: 'section-category', offset: 116 },
  { key: 'monthly', id: 'section-monthly', offset: 45 },
  { key: 'targets', id: 'section-targets', offset: 188 },
];
export function activeDashboardSection(top: number, destinations: { key: DashboardSection; top: number }[]): DashboardSection {
  return destinations.reduce<DashboardSection>((active, item) => top + 48 >= item.top ? item.key : active, 'home');
}
