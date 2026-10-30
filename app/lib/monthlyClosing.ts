import { annualCategory } from './annual.ts';
import { presentationAssessmentLabel } from './presentationAssessments.ts';
import { groupMetricBlocks, qualitativeMetrics, performanceTier, type DASetting, type MetricDefinition, type PerformanceTier, type SECGroup } from './groups.ts';

export type GroupId = SECGroup['id'];
export type ResultState = 'value' | 'missing' | 'invalid' | 'not-applicable';
export type ClosingMetric = MetricDefinition & { resultState: ResultState; achievement: number | null; actual: number | null; target: number | null };
export type MonthlyReport = {
  reportId: string; publicationId: string; revision: number; groupId: GroupId;
  sourceLevel?: string | null;
  month: string; publishedAt: string; configurationVersion: string; setting: DASetting;
  sellout: number | null; softbonus: number | null; tier: PerformanceTier; points: number | null;
  extrasAvailable?: boolean;
  premium: number | null; extras: { type: string; amount: number }[];
  metrics: ClosingMetric[]; qualitative: ClosingMetric[]; changed: string[];
};
export type PointHistoryEntry = { month: string; points: number | null; sourceLevel?: string | null };
/** Use the same supplied monthly category as the summary; point-only history has documented 1/2/3 awards. */
export function historyMonthTier(points:number|null,report?:Pick<MonthlyReport,'tier'|'points'>):PerformanceTier {
  return report?(report.points===null?'unavailable':report.tier):(points===3?'gold':points===2?'silver':points===1?'bronze':'unavailable');
}
export type PreviewScenario = 'standard' | 'new-month' | 'release-window' | 'correction' | 'old-correction' | 'missing' | 'zero' | 'partial' | 'percent-only' | 'empty' | 'lag' | 'offline';
export const PREVIEW_SCENARIOS: { value: PreviewScenario; label: string }[] = [
  { value: 'standard', label: 'Neuer September-Abschluss' }, { value: 'new-month', label: 'Oktober kommt hinzu' },
  { value: 'release-window', label: 'Veröffentlichungsfenster · 17. Oktober' },
  { value: 'correction', label: 'September korrigiert' }, { value: 'old-correction', label: 'Juli korrigiert' },
  { value: 'missing', label: 'Fehlende / ungültige Werte' }, { value: 'zero', label: 'Echte Nullwerte' },
  { value: 'partial', label: 'Lücken im Jahresstand' }, { value: 'percent-only', label: 'Nur Prozentwerte' },
  { value: 'empty', label: 'Noch kein Abschluss' }, { value: 'lag', label: 'September noch offen' },
  { value: 'offline', label: 'Aktualisierung fehlgeschlagen' },
];
export const DEMO_CALENDAR_DAY = '2026-10-12';
const rounding = (n: number) => Math.round(n * 10) / 10;
export const monthName = (month: string, short = false) => new Intl.DateTimeFormat('de-AT', { month: short ? 'short' : 'long', year: short ? undefined : 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`));
export const publicationDate = (value: string) => new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Vienna' }).format(new Date(value));
export function previousMonth(month: string) {
  const [year, number] = month.split('-').map(Number);
  return `${number === 1 ? year - 1 : year}-${String(number === 1 ? 12 : number - 1).padStart(2, '0')}`;
}

function fixtureMetric(metric: MetricDefinition, group: GroupId, monthIndex: number): ClosingMetric {
  const localKey = metric.key.replace(/^(he|im)-/, '');
  const he = group === 'HE' || metric.key.startsWith('he-');
  const base: Record<string, [number, number]> = { units: [53, 50], soundbar: [14, 18], asp: [927, 900], share: [48, 50] };
  const pair = he ? base[localKey] : undefined;
  const hash = [...metric.key].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const target = pair?.[1] ?? (metric.unit === '€' ? 1000 : metric.unit === '%' ? 100 : 100);
  const baseline = pair?.[0] ?? (group === 'ST' ? 94 : group === 'DA' ? 96 + hash % 5 : 97 + hash % 6);
  const actual = rounding(Math.max(0, (pair ? baseline : baseline / 100 * target) - (8 - monthIndex) * target * .006));
  return { ...metric, resultState: 'value', achievement: rounding(actual / target * 100), actual, target };
}
function weighted(metrics: readonly ClosingMetric[]) {
  if (!metrics.length || metrics.some(m => m.achievement === null || m.weight === null)) return null;
  const denominator = metrics.reduce((n, m) => n + m.weight!, 0);
  return denominator ? rounding(metrics.reduce((n, m) => n + m.achievement! * m.weight!, 0) / denominator) : null;
}

/** Synthetic, internally consistent published closings. Never a real payout calculator. */
export function closingFixtures(group: GroupId, setting: DASetting = 'full', scenario: PreviewScenario = 'standard'): MonthlyReport[] {
  if (scenario === 'empty') return [];
  const months = ['2025-10', '2025-11', '2025-12', ...Array.from({ length: scenario === 'new-month' ? 10 : scenario === 'lag' ? 8 : 9 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`)];
  let reports = months.map(month => {
    const index = Number(month.slice(5)) - 1;
    const metrics = groupMetricBlocks(group, setting).flatMap(block => block.metrics.map(m => fixtureMetric(m, group, index)));
    const qualitative = group === 'ST' ? metrics : qualitativeMetrics(group).map(m => ({ ...m, label: m.key === 'knowledge' ? presentationAssessmentLabel(month, m.label) : m.label, resultState: 'value' as const, achievement: group === 'HE' ? 100 : group === 'LH' ? 96 : 98, actual: null, target: null }));
    const softbonus = group === 'LH' ? 96 : weighted(qualitative);
    const sellout = group === 'ST' ? null : group === 'LH' ? rounding((weighted(metrics.filter(m => m.key.startsWith('he-')))! + weighted(metrics.filter(m => m.key.startsWith('im-')))!)/2) : weighted(metrics);
    const tier = group === 'ST' ? 'unavailable' : performanceTier(group, sellout, softbonus);
    const points = tier === 'gold' ? 3 : tier === 'silver' ? 2 : tier === 'bronze' ? 1 : null;
    const base = { HE: 1285, DA: 980, IM: 1410, LH: 1620, ST: 0 }[group];
    return { reportId: `demo-${group}-${setting}-${month}`, publicationId: `demo-${group}-${setting}-${month}-r1`, revision: 1, groupId: group, month,
      publishedAt: `${month === '2025-12' ? '2026-01' : Number(month.slice(5)) === 12 ? `${Number(month.slice(0,4))+1}-01` : `${month.slice(0,4)}-${String(Number(month.slice(5))+1).padStart(2,'0')}`}-01T08:00:00+02:00`,
      configurationVersion: `demo-${group}-${setting}-2026`, setting, sellout, softbonus, tier, points,
      premium: group === 'ST' ? null : base + (index - 8) * 35, extras: group === 'ST' || group === 'LH' || group === 'DA' && setting === 'laundry-ref' ? [] : [{ type: group === 'IM' ? 'Sales Race' : group === 'DA' ? 'Zusatzprämie' : 'On-top', amount: 100 + index * 10 }],
      metrics, qualitative, changed: group === 'ST' ? ['Qualitative Bewertung'] : ['Sell-out', 'Softbonus', 'Monatsprämie'],
    } satisfies MonthlyReport;
  });
  if (scenario === 'partial') reports = reports.filter(r => !['2026-02', '2026-05'].includes(r.month));
  if (scenario === 'percent-only') reports = reports.map(r => ({ ...r, metrics: r.metrics.map(m => ({ ...m, actual: null, target: null })), qualitative: r.qualitative.map(m => ({ ...m, actual: null, target: null })) }));
  const last = reports.at(-1)!;
  if (scenario === 'missing') {
    last.premium = null; last.points = null; last.tier = 'unavailable';
    if (group !== 'ST') last.sellout = null; else last.softbonus = null;
    last.metrics = last.metrics.map((m, i) => i < 2 ? { ...m, achievement: null, actual: null, resultState: i ? 'invalid' : 'missing' } : m);
    if (group === 'ST') last.qualitative = last.metrics;
  }
  if (scenario === 'zero') {
    last.premium = group === 'ST' ? null : 0; last.extras = []; last.sellout = group === 'ST' ? null : 0; last.softbonus = 0;
    last.metrics = last.metrics.map(m => ({ ...m, achievement: 0, actual: 0 })); last.qualitative = last.qualitative.map(m => ({ ...m, achievement: 0, actual: null }));
    last.tier = group === 'ST' ? 'unavailable' : 'bronze'; last.points = group === 'ST' ? null : 1;
  }
  if (scenario === 'correction' || scenario === 'old-correction') {
    const original = scenario === 'correction' ? last : reports.find(r => r.month === '2026-07')!;
    const report = { ...original };
    report.revision = 2; report.publicationId = `${report.reportId}-r2`;
    report.publishedAt = '2026-10-12T09:00:00+02:00'; report.changed = group === 'ST' ? ['Qualitative Bewertung'] : ['Monatsprämie'];
    if (group === 'ST') { report.softbonus = 90; report.metrics = report.metrics.map(m => ({ ...m, achievement: 90, actual: m.target === null ? null : m.target * .9 })); report.qualitative = report.metrics; }
    else report.premium = Math.max(0, (report.premium ?? 0) - 80);
    reports.push(report);
  }
  return reports;
}

export function activeReports(reports: readonly MonthlyReport[]) {
  const months = new Map<string, MonthlyReport>();
  for (const report of reports) {
    const previous = months.get(report.month);
    if (!previous || report.revision > previous.revision) months.set(report.month, report);
  }
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
}
export function latestReport(reports: readonly MonthlyReport[]) { return activeReports(reports).at(-1) ?? null; }
export function rollingClosing(history: readonly PointHistoryEntry[], selected: Pick<MonthlyReport,'month'|'groupId'>) {
  const months=[selected.month];
  while(months.length<12)months.unshift(previousMonth(months[0]));
  const byMonth=new Map(history.map(row=>[row.month,row]));
  const valid=(row:PointHistoryEntry|undefined)=>typeof row?.points==='number'&&Number.isFinite(row.points)&&row.points>=0&&row.points<=3;
  const known=months.flatMap(month=>valid(byMonth.get(month))?[byMonth.get(month)!]:[]);
  const missing=months.filter(month=>!valid(byMonth.get(month)));
  const points=selected.groupId==='ST'||!known.length?null:known.reduce((sum,row)=>sum+row.points!,0);
  const supplied=byMonth.get(selected.month)?.sourceLevel?.replace(/\s/g,'').toUpperCase();
  const sourceLevel=supplied==='SEC'?'SEC':supplied==='SEC+'?'SEC+':supplied==='SECPRO'?'SEC Pro':null;
  const level=selected.groupId==='ST'?null:!missing.length&&points!==null?annualCategory(points):sourceLevel;
  return {fromMonth:months[0],throughMonth:selected.month,months,missing,knownMonths:known.length,partial:missing.length>0,points,level};
}
export function annualClosing(reports: readonly MonthlyReport[], selected: MonthlyReport) {
  const year = selected.month.slice(0,4);
  const eligible = activeReports(reports).filter(r => r.month.startsWith(year) && r.month <= selected.month);
  const expected = Array.from({ length: Number(selected.month.slice(5)) }, (_, i) => `${year}-${String(i+1).padStart(2,'0')}`);
  const missing = expected.filter(month => !eligible.some(r => r.month === month));
  const knownMoney = eligible.filter(r => r.premium !== null);
  const knownExtras=eligible.filter(r=>r.extrasAvailable!==false);
  return { year, throughMonth: selected.month, reports: eligible, missing,
    partial: missing.length > 0 || knownExtras.length < eligible.length || knownMoney.length < eligible.length && selected.groupId !== 'ST',
    premium: knownMoney.length ? knownMoney.reduce((sum,r) => sum + r.premium!,0) : null,
    extras: knownExtras.length?knownExtras.flatMap(r => r.extras).reduce((sum,e) => sum+e.amount,0):null, extrasPartial:knownExtras.length<eligible.length,
    publicationSetId: eligible.map(r => r.publicationId).join('|'),
  };
}
export function compareClosing(report: MonthlyReport, reports: readonly MonthlyReport[], key: 'sellout' | 'softbonus') {
  const prior = activeReports(reports).find(r => r.month === previousMonth(report.month));
  if (!prior || prior.configurationVersion !== report.configurationVersion || prior[key] === null || report[key] === null) return null;
  return { value: rounding(report[key]! - prior[key]!), month: prior.month };
}
export function newPublications(reports: readonly MonthlyReport[]) {
  const latest = latestReport(reports);
  return activeReports(reports).filter(r => r.publicationId === latest?.publicationId || r.revision > 1);
}
export const publicationReadKey = (group: GroupId, setting: DASetting) => `sec-monthly-read/v1/demo-${group}-${setting}`;
export function calendarTimeline(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(`${day}T12:00:00Z`);
  if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0,10) !== day) return null;
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
  return { month: day.slice(0,7), day: date.getUTCDate(), lastDay, progress: (date.getUTCDate()-1)/(lastDay-1)*100 };
}

/** Expected monthly delivery window: countdown to the 15th, waiting through the 20th. */
export function nextKPIRelease(day: string) {
  const calendar = calendarTimeline(day);
  if (!calendar) return null;
  const today = new Date(day+'T12:00:00Z');
  const monthOffset = calendar.day > 20 ? 1 : 0;
  const release = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + monthOffset, 15, 12));
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + monthOffset, 20, 12));
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + monthOffset - 1, 20, 12));
  const inWindow = calendar.day >= 15 && calendar.day <= 20;
  return { date: release.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10),
    daysRemaining: Math.max(0, Math.round((release.valueOf()-today.valueOf())/86400000)),
    status: inWindow ? 'window' as const : 'countdown' as const,
    progress: inWindow ? 100 : Math.min(100, Math.max(0, (today.valueOf()-start.valueOf())/(release.valueOf()-start.valueOf())*100)),
    cycleStart: start.toISOString().slice(0,10),
  };
}
