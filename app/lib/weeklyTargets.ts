import { groupMetricBlocks, type DASetting, type MetricDefinition, type SECGroup } from './groups.ts';
import { calendarTimeline } from './monthlyClosing.ts';

export type WeeklyTarget = MetricDefinition & { target: number | null; actual: number | null };
export type WeeklyTargetSnapshot = {
  id: string;
  groupId: SECGroup['id'];
  setting: DASetting;
  month: string;
  asOf: string;
  updatedAt: string;
  replayAvailableOn?: string;
  metrics: readonly WeeklyTarget[];
};

/** Weekly deliveries replace the cumulative month-to-date snapshot; never sum them. */
function deliveredTargets(snapshots: readonly WeeklyTargetSnapshot[], group: SECGroup['id'], setting: DASetting, calendarDay: string) {
  if (!calendarTimeline(calendarDay)) return [];
  return snapshots.filter(snapshot => snapshot.groupId === group && snapshot.setting === setting
    && snapshot.month === calendarDay.slice(0, 7) && calendarTimeline(snapshot.asOf) && snapshot.asOf.startsWith(snapshot.month + '-')
    && Number.isFinite(Date.parse(snapshot.updatedAt))
    && snapshot.asOf <= calendarDay && (snapshot.replayAvailableOn??snapshot.updatedAt.slice(0, 10)) <= calendarDay);
}

export function currentTargets(snapshots: readonly WeeklyTargetSnapshot[], group: SECGroup['id'], setting: DASetting, calendarDay: string) {
  return deliveredTargets(snapshots, group, setting, calendarDay)
    .sort((a, b) => b.asOf.localeCompare(a.asOf) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0] ?? null;
}

export function targetAchievement(actual: number | null, target: number | null) {
  return actual !== null && target !== null && Number.isFinite(actual) && Number.isFinite(target) && actual >= 0 && target > 0
    ? Math.round(actual / target * 1000) / 10 : null;
}

/** One active revision per dated MTD stand, ordered chronologically for the selected goal. */
export function targetProgressHistory(snapshots: readonly WeeklyTargetSnapshot[], group: SECGroup['id'], setting: DASetting, calendarDay: string, key: string) {
  const dates = new Map<string, WeeklyTargetSnapshot>();
  for (const snapshot of deliveredTargets(snapshots, group, setting, calendarDay)) {
    const existing = dates.get(snapshot.asOf);
    if (!existing || Date.parse(snapshot.updatedAt) > Date.parse(existing.updatedAt)) dates.set(snapshot.asOf, snapshot);
  }
  const ordered=[...dates.values()].sort((a, b) => a.asOf.localeCompare(b.asOf));
  if(!ordered.some(s=>s.metrics.some(m=>m.key===key)))return[];
  return ordered.flatMap(snapshot => {
    const metric = snapshot.metrics.find(metric => metric.key === key);
    return [{ asOf: snapshot.asOf, updatedAt: snapshot.updatedAt, actual: metric?.actual??null, target: metric?.target??null, unit:metric?.unit??null, achievement: metric?targetAchievement(metric.actual, metric.target):null }];
  }).map((stand, index, history) => {
    const previous = history[index - 1];
    // Compare adjacent cumulative stands, never a missing basis or an older month.
    const difference = stand.unit===previous?.unit && stand.actual !== null && previous?.actual != null
      && Number.isFinite(stand.actual) && Number.isFinite(previous.actual) && stand.actual >= 0 && previous.actual >= 0
      ? Math.round((stand.actual - previous.actual) * 10) / 10 : null;
    return { ...stand, change: difference !== null && Number.isFinite(difference) ? difference || 0 : null, previousAsOf: previous?.asOf ?? null };
  });
}

// Separate synthetic current-month inputs, not recycled published closing values.
// These dates are sample deliveries, not a promised production weekday or scheduler.
export function weeklyTargetFixtures(group: SECGroup['id'], setting: DASetting = 'full'): WeeklyTargetSnapshot[] {
  const definitions = groupMetricBlocks(group, setting).flatMap(block => block.metrics);
  const heValues: Record<string, [number, number]> = { units: [50, 21], soundbar: [18, 7], asp: [900, 918], share: [50, 47] };
  return ['2026-10', '2026-11'].flatMap(month => [1, 4, 8, 15].map(day => ({
    id: `demo-targets-${group}-${setting}-${month}-${day}`,
    groupId: group, setting, month, asOf: `${month}-${String(day).padStart(2, '0')}`,
    updatedAt: `${month}-${String(day === 4 ? 5 : day).padStart(2, '0')}T08:00:00Z`,
    metrics: definitions.map((metric, index) => {
      const localKey = metric.key.replace(/^he-/, '');
      const he = group === 'HE' || metric.key.startsWith('he-');
      const target = group === 'ST' ? 100 : he ? heValues[localKey][0] : metric.unit === '€' ? 1000 : 40 + index * 10;
      const baseline = he ? heValues[localKey][1] : metric.unit === '€' ? 970 : Math.round(target * (.35 + index % 3 * .04));
      const actual = group === 'ST' || day === 1 ? null : metric.unit === 'Stück' ? Math.round(baseline * (day === 4 ? .5 : day === 15 ? 1.5 : 1)) : day === 4 ? baseline - (metric.unit === '€' ? 15 : 2) : baseline;
      return { ...metric, target, actual };
    }),
  })));
}
