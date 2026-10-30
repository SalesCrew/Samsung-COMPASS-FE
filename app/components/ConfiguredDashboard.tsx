import { ClipboardCheck, Euro, Headphones, House, Info, Monitor, Refrigerator, Smartphone, Speaker, Tablet, WashingMachine, Watch, Wind } from 'lucide-react';
import { GROUP_DEMO, groupDemoAt, metricDemo } from '../lib/demo';
import { DA_SETTINGS, groupMetricBlocks, qualitativeMetrics, type MetricDefinition, type SECGroup } from '../lib/groups';
import { MONTHS, cutoff, historyRows, shortDate, snapshotUpdates, type DashboardFilters } from '../lib/dashboard';
import { annualCategory, leaderboardState } from '../lib/annual';
import { AnnualPointsCard, CategoryHistoryCard, LeaderboardCard } from './AnnualOverview';
import { IncentiveCard } from './IncentiveCard';
import { PerformanceChart } from './PerformanceChart';
import { SoftbonusOverviewCard } from './SoftbonusOverview';
import { CompositionBreakdown } from './CompositionBreakdown';

const ICONS = { tv: Monitor, speaker: Speaker, euro: Euro, home: House, phone: Smartphone, watch: Watch, tablet: Tablet, headphones: Headphones, laundry: WashingMachine, fridge: Refrigerator, vacuum: Wind, check: ClipboardCheck };
const weightLabel = (weight: number | null) => weight === null ? 'Gewicht offen' : weight === 100 / 3 ? '⅓ Gewicht' : `${weight}% Gewicht`;

function MetricCard({ metric, index, available, monthOffset }: { metric: MetricDefinition; index: number; available: boolean; monthOffset: number }) {
  const Icon = ICONS[metric.icon];
  const value = metricDemo(metric, index);
  const actual = Math.max(0, Math.round(value.actual + monthOffset * value.target * .015));
  const achievement = Math.round(actual / value.target * 100);
  return <article className="configured-metric" data-metric={metric.key}>
    <span className="configured-metric-icon"><Icon size={38} strokeWidth={1.6} /></span>
    <div className="configured-metric-copy"><h4>{metric.label}</h4><strong>{available ? `${achievement}%` : '—'}</strong><p>Ist {available ? actual : '—'} <span>/</span> Ziel {value.target} <small>{metric.unit}</small></p><small>{weightLabel(metric.weight)}</small></div>
  </article>;
}

export function SoftbonusDetails({ group, available = true }: { group: SECGroup; available?: boolean }) {
  const values = [96, 91, 98, 94];
  return <section className="configured-card qualitative-details" aria-label={`${group.id} Softbonus-Kriterien`}>
    <div className="configured-section-title"><h3>Softbonus</h3><span>{group.id === 'LH' ? 'Untergewichte offen' : '15% der Monatsleistung'}</span></div>
    <p className="configured-caption">{group.id === 'LH' ? 'Kriterien aus dem LH-Closing. Aktuelle Bewertungsgewichte fehlen.' : 'Drei gleich gewichtete Bereiche · Level Up 2026'}</p>
    <div className="quality-rows">{qualitativeMetrics(group.id).map((metric, index) => <div key={metric.key}><span>{metric.label}</span><small>{weightLabel(metric.weight)}</small><b>{available ? `${values[index]}%` : '—'}</b></div>)}</div>
    <p className="configured-caption">Demo-Werte für die visuelle Abstimmung.</p>
  </section>;
}

export function ConfiguredDashboard({ group, filters, onOpenFilters, onOpenRules, rulesOpen }: {
  group: SECGroup; filters: DashboardFilters; onOpenFilters: () => void; onOpenRules: () => void; rulesOpen: boolean;
}) {
  const isST = group.id === 'ST';
  const blocks = groupMetricBlocks(group.id, filters.daSetting);
  const currentDemo = groupDemoAt(group.id, filters);
  const demo = currentDemo ?? GROUP_DEMO[group.id];
  const hasResult = currentDemo !== null;
  const monthOffset = Number(filters.month.slice(-2)) - 9;
  const latestUpdate = snapshotUpdates(group.id, filters.month).filter(item => item.date <= cutoff(filters)).at(-1);
  const month = MONTHS.find(value => value.id === filters.month)?.label ?? filters.month;
  const showLeaderboard = !isST && leaderboardState(demo.pool, hasResult ? demo.rank : null).visible;
  const categories = historyRows(filters).filter(row => row.id >= '2026-06').flatMap(row => {
    const snapshot = groupDemoAt(group.id, { ...filters, month: row.id, snapshot: 'latest' });
    return snapshot ? [{ id: row.id, short: row.short, category: annualCategory(snapshot.annualPoints), tier:snapshot.tier }] : [];
  });
  return <main className="configured-dashboard">
    <IncentiveCard group={group} month={filters.month} asOf={cutoff(filters)} />
    <div className={`configured-overview${!showLeaderboard ? ' without-leaderboard' : ''}`}>
      {isST ? <SoftbonusOverviewCard value={hasResult ? demo.softbonus : null} month={month} criteriaCount={blocks.flatMap(block => block.metrics).length} /> : <AnnualPointsCard points={hasResult ? demo.annualPoints : null} tier={hasResult ? demo.tier : 'unavailable'} month={month} onOpenRules={onOpenRules} rulesOpen={rulesOpen} flow fullWidth={!showLeaderboard} />}
      {showLeaderboard && <LeaderboardCard pool={demo.pool} rank={hasResult ? demo.rank : null} flow />}
    </div>

    <PerformanceChart group={group} filters={filters} onOpenRules={onOpenRules} rulesOpen={rulesOpen} className="configured-card configured-history" />

    <div className="configured-history-footer">
      {isST ? <section className="configured-card configured-category"><h3>SmartHome</h3><p>{hasResult ? `${demo.softbonus}%` : '—'} Softbonus<br /><small>4 qualitative Kriterien · Demo</small></p></section> : <CategoryHistoryCard groupId={group.id} entries={categories} flow />}
      <div className="configured-card configured-period update-preview-card"><button className="update-preview-inset" onClick={onOpenFilters} aria-label="Datenstand und Änderungen filtern"><small>DATENSTAND</small><strong>{shortDate(latestUpdate?.date ?? '2026-09-24')}</strong><span>{latestUpdate?.changed.length ?? 0} Bereiche neu</span></button></div>
    </div>

    <section className="configured-month-section" id={`${group.id}-section-monthly`} aria-labelledby={`${group.id}-monthly-title`}>
      <header className="configured-month-header"><h2 id={`${group.id}-monthly-title`}>{isST ? 'Qualitative Leistung' : 'Monatsleistung'}</h2><p>{group.id} · {month} 2026</p><small>Vollständige visuelle Demo</small></header>
      {!isST && <div className="configured-card configured-summary">
        <div className="configured-summary-pane"><strong>{hasResult ? `${demo.overall}%` : '—'}</strong><p>Zielerreichung</p></div><div className="configured-summary-pane"><strong>{hasResult && filters.comparison !== 'none' ? `+${demo.delta.toLocaleString('de-DE')}` : '—'}{hasResult && filters.comparison !== 'none' && <small> Pp.</small>}</strong><p>{filters.comparison === 'none' ? 'Vergleich aus' : filters.comparison === 'month' ? 'zum Vormonat' : 'zur Vorwoche'}</p></div>
      </div>}
      <CompositionBreakdown group={group} />
      {group.id === 'DA' && <label className="configured-setting">KPI-Setting für diese Vorschau<button onClick={onOpenFilters}>{DA_SETTINGS.find(setting => setting.value === filters.daSetting)?.label}<FilterHint /></button><small>Die persönliche Zuordnung muss noch bestätigt werden.</small></label>}
      {blocks.map((block, index) => <section className="configured-card configured-metric-block" key={block.label} id={isST && index === 0 ? `${group.id}-section-category` : undefined}>
        <div className="configured-section-title"><h3>{block.label}</h3><span>{block.metrics.length} {isST ? 'Kriterien' : 'KPIs'}</span></div>
        <p className="configured-caption">{block.note}</p>
        <div className="configured-metric-grid">{block.metrics.filter((metric, metricIndex) => filters.kpi === 'all' || filters.kpi === metric.key || (filters.kpi === 'below' && hasResult && metricDemo(metric, metricIndex).achievement < 100)).map((metric, metricIndex) => <MetricCard key={metric.key} metric={metric} index={metricIndex} available={hasResult} monthOffset={monthOffset} />)}</div>
        {filters.kpi !== 'all' && filters.kpi !== 'below' && !block.metrics.some(metric => metric.key === filters.kpi) && <p className="configured-caption">Kein KPI dieses Bereichs ausgewählt.</p>}
      </section>)}
      {group.id === 'DA' && filters.daSetting !== 'laundry-ref' && <section className="configured-card configured-stretch"><span>VC STICK · STRETCH</span><strong>&gt;150%</strong><p>On-top-Bonus laut Level Up 2026</p><small>Bonusbetrag und Berechnung noch offen.</small></section>}
      {!isST && <SoftbonusDetails group={group} available={hasResult} />}
      <p className="configured-data-note"><Info size={24} />Zahlen sind Demo-Werte. Gewichte stammen aus den Quellen.</p>
    </section>
  </main>;
}

function FilterHint() { return <span aria-hidden="true">Ändern</span>; }
