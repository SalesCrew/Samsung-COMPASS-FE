import type { MetricDefinition, PerformanceTier, SECGroup } from './groups.ts';
import { MONTHS, groupDefaultFilters, monthlyView, type DashboardFilters } from './dashboard.ts';

export type GroupDemo = {
  premiumCurrent: number;
  premiumYtd: number;
  premiumMaximum: number;
  payoutPercent: number;
  onTop: number;
  annualPoints: number;
  rank: number;
  pool: number;
  overall: number;
  delta: number;
  sellout: number;
  softbonus: number;
  tier: Exclude<PerformanceTier, 'unavailable' | 'unresolved'>;
};

// Deliberately synthetic presentation data. These values only make every
// dashboard state visually reviewable while the real result feed is pending.
export const GROUP_DEMO: Record<SECGroup['id'], GroupDemo> = {
  HE: { premiumCurrent: 1285, premiumYtd: 8436, premiumMaximum: 1500, payoutPercent: 86, onTop: 215, annualPoints: 27, rank: 7, pool: 24, overall: 98, delta: 4.2, sellout: 98, softbonus: 100, tier: 'gold' },
  DA: { premiumCurrent: 980, premiumYtd: 6740, premiumMaximum: 1250, payoutPercent: 78, onTop: 140, annualPoints: 22, rank: 14, pool: 31, overall: 93, delta: 2.1, sellout: 93, softbonus: 96, tier: 'silver' },
  IM: { premiumCurrent: 1410, premiumYtd: 9120, premiumMaximum: 1600, payoutPercent: 88, onTop: 260, annualPoints: 30, rank: 4, pool: 28, overall: 97, delta: 3.6, sellout: 97, softbonus: 98, tier: 'gold' },
  LH: { premiumCurrent: 1620, premiumYtd: 10480, premiumMaximum: 1800, payoutPercent: 90, onTop: 180, annualPoints: 24, rank: 2, pool: 4, overall: 95, delta: 2.8, sellout: 95, softbonus: 96, tier: 'gold' },
  ST: { premiumCurrent: 720, premiumYtd: 4980, premiumMaximum: 900, payoutPercent: 80, onTop: 90, annualPoints: 18, rank: 6, pool: 19, overall: 94, delta: 1.8, sellout: 94, softbonus: 94, tier: 'silver' },
};

/** Distinct synthetic month/snapshot figures for UI review; never a payout formula. */
export function groupDemoAt(group: SECGroup['id'], filters: DashboardFilters): GroupDemo | null {
  const view = monthlyView(filters);
  if (!view.available || view.targetOnly) return null;
  const base = GROUP_DEMO[group];
  const monthOffset = Number(filters.month.slice(-2)) - 9;
  const olderSnapshot = filters.month === '2026-09' && filters.snapshot === '2026-09-16';
  const step = monthOffset * 2 - (olderSnapshot ? 4 : 0);
  return {
    ...base,
    premiumCurrent: Math.max(0, base.premiumCurrent + monthOffset * 55 - (olderSnapshot ? 65 : 0)),
    premiumYtd: Math.max(0, base.premiumYtd + monthOffset * Math.round(base.premiumCurrent * .88)),
    annualPoints: Math.max(0, base.annualPoints + monthOffset * 3),
    overall: Math.max(0, base.overall + step),
    sellout: Math.max(0, base.sellout + step),
    softbonus: Math.max(0, base.softbonus + monthOffset - (group === 'ST' && olderSnapshot ? 2 : 0)),
    delta: olderSnapshot ? 0 : base.delta,
  };
}

/** The incentive card keeps the last completed monthly bonus until a newer closing exists. */
export function lastCompletedBonus(group: SECGroup['id']): GroupDemo | null {
  const lastClosedMonth = MONTHS.filter(month => month.id < '2026-09').at(-1);
  return lastClosedMonth ? groupDemoAt(group, { ...groupDefaultFilters(group), month: lastClosedMonth.id, snapshot: 'latest', status: 'all' }) : null;
}

const number = new Intl.NumberFormat('de-DE');
export const euro = (value: number) => number.format(value);

export function metricDemo(metric: MetricDefinition, index = 0) {
  const hash = [...metric.key].reduce((total, character) => total + character.charCodeAt(0), 0) + index * 17;
  const achievement = 88 + (hash % 21);
  const target = metric.unit === '€' ? 900 + (hash % 5) * 50 : metric.unit === '%' ? 100 : 40 + (hash % 7) * 5;
  const actual = Math.round(target * achievement / 100);
  return { achievement, target, actual };
}

export const DEMO_HISTORY: Record<SECGroup['id'], readonly { month: string; sellout: number; softbonus: number }[]> = {
  HE: [{ month: 'Apr', sellout: 88, softbonus: 94 }, { month: 'Mai', sellout: 92, softbonus: 96 }, { month: 'Jun', sellout: 89, softbonus: 93 }, { month: 'Jul', sellout: 94, softbonus: 100 }, { month: 'Aug', sellout: 88, softbonus: 96 }, { month: 'Sep', sellout: 98, softbonus: 100 }],
  DA: [{ month: 'Apr', sellout: 84, softbonus: 91 }, { month: 'Mai', sellout: 88, softbonus: 93 }, { month: 'Jun', sellout: 91, softbonus: 94 }, { month: 'Jul', sellout: 89, softbonus: 95 }, { month: 'Aug', sellout: 92, softbonus: 95 }, { month: 'Sep', sellout: 93, softbonus: 96 }],
  IM: [{ month: 'Apr', sellout: 91, softbonus: 93 }, { month: 'Mai', sellout: 94, softbonus: 95 }, { month: 'Jun', sellout: 96, softbonus: 96 }, { month: 'Jul', sellout: 93, softbonus: 97 }, { month: 'Aug', sellout: 95, softbonus: 97 }, { month: 'Sep', sellout: 97, softbonus: 98 }],
  LH: [{ month: 'Apr', sellout: 89, softbonus: 92 }, { month: 'Mai', sellout: 91, softbonus: 94 }, { month: 'Jun', sellout: 93, softbonus: 95 }, { month: 'Jul', sellout: 92, softbonus: 95 }, { month: 'Aug', sellout: 94, softbonus: 96 }, { month: 'Sep', sellout: 95, softbonus: 96 }],
  ST: [{ month: 'Apr', sellout: 88, softbonus: 88 }, { month: 'Mai', sellout: 90, softbonus: 90 }, { month: 'Jun', sellout: 91, softbonus: 91 }, { month: 'Jul', sellout: 92, softbonus: 92 }, { month: 'Aug', sellout: 93, softbonus: 93 }, { month: 'Sep', sellout: 94, softbonus: 94 }],
};
