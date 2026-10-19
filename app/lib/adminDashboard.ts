import { GROUP_DEMO } from './demo.ts';
import { MEETING_PEOPLE, type MeetingPerson } from './adminDemo.ts';
import type { SECGroup } from './groups.ts';
import type { LiveDashboardSource } from './adminLiveData.ts';
import type { MonthlyReport, ClosingMetric } from './monthlyClosing.ts';

export type DashboardFocus = 'all' | 'on-track' | 'watch' | 'below' | 'model-open';
export type DashboardMonth = string;
export type DashboardScope = {
  month: DashboardMonth;
  snapshot: string;
  group: 'all' | SECGroup['id'];
  market: string;
  focus: DashboardFocus;
};

export type DashboardResult = {
  person: MeetingPerson;
  achievement: number | null;
  softbonus: number | null;
  premium: number | null;
  focus: Exclude<DashboardFocus, 'all'>;
  name?: string; recordId?: string; report?: MonthlyReport; metrics?: readonly ClosingMetric[];
};

export const DEFAULT_DASHBOARD_SCOPE: DashboardScope = {
  month: '2026-09', snapshot: 'latest', group: 'all', market: 'all', focus: 'all',
};

/** Fictional UI-only values. This is not an SEC result or payout formula. */
export function demoDashboardResult(person: MeetingPerson, scope: Pick<DashboardScope, 'month' | 'snapshot'>): DashboardResult {
  if (person.group === 'ST') return { person, achievement: null, softbonus: null, premium: null, focus: 'model-open' };
  const base = GROUP_DEMO[person.group];
  const monthShift = Number(scope.month.slice(-2)) - 9;
  const snapshotShift = scope.month === '2026-09' && scope.snapshot === '2026-09-16' ? -4 : 0;
  const achievement = Math.max(0, base.overall + person.shift + monthShift * 2 + snapshotShift);
  const softbonus = Math.max(0, base.softbonus + Math.round(person.shift / 2) + (snapshotShift ? -2 : 0));
  const premium = Math.max(0, base.premiumCurrent + person.shift * 15 + monthShift * 20 + (snapshotShift ? -65 : 0));
  const focus = achievement >= 95 && softbonus >= 95 ? 'on-track'
    : achievement >= 90 && softbonus >= 90 ? 'watch' : 'below';
  return { person, achievement, softbonus, premium, focus };
}

export function dashboardResults(scope: DashboardScope, source?: LiveDashboardSource): DashboardResult[] {
  if (source) return source.results(scope);
  return MEETING_PEOPLE.filter(person =>
    (scope.group === 'all' || person.group === scope.group) &&
    (scope.market === 'all' || person.market === scope.market),
  ).map(person => demoDashboardResult(person, scope)).filter(result => scope.focus === 'all' || result.focus === scope.focus);
}

export function average(values: (number | null)[]): number | null {
  const defined = values.filter((value): value is number => value !== null);
  return defined.length ? defined.reduce((sum, value) => sum + value, 0) / defined.length : null;
}

export function dashboardTrend(scope: DashboardScope, source?: LiveDashboardSource) {
  const months: DashboardMonth[] = source ? source.months.map(m=>m.value).sort() : ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
  return months.filter(month => month <= scope.month).map(month => {
    // Earlier months are illustrative trajectories; the imported fixture has no older person results.
    const results = dashboardResults({ ...scope, month, snapshot: source ? 'latest' : month === '2026-09' ? scope.snapshot : 'latest' }, source);
    return {
      month,
      achievement: average(results.map(item => item.achievement)),
      softbonus: average(results.map(item => item.softbonus)),
    };
  });
}
