import { groupMetricBlocks, type SECGroup } from '../lib/groups';
import { activeReports, annualClosing, monthName, type MonthlyReport } from '../lib/monthlyClosing';
import type { DashboardFilters } from '../lib/dashboard';
import { AnnualPointsCard, CategoryHistoryCard, LeaderboardCard } from './AnnualOverview';
import { MonthlyReportSummary } from './MonthlyReportSummary';
import { AnnualPremiumCard, MonthlyPremiumCard } from './PremiumCards';
import { PerformanceChart } from './PerformanceChart';
import { ClosingMetricExplorer } from './ClosingMetricExplorer';
import { KPIReleaseCountdown } from './KPIReleaseCountdown';
import { CurrentMonthTargets } from './CurrentMonthTargets';
import type { WeeklyTargetSnapshot } from '../lib/weeklyTargets';
export function MonthlyDashboard({ group, report, reports, filters, calendarDay, targetSnapshots, unread, latestUnread, onDetails, onLatest, onOpenRules, rulesOpen, onTargetsView, realData=false, ranking }: {
  group: SECGroup; report: MonthlyReport | null; reports: readonly MonthlyReport[]; filters: DashboardFilters; calendarDay: string;
  targetSnapshots: readonly WeeklyTargetSnapshot[]; unread: boolean; latestUnread: MonthlyReport | null; onDetails: () => void; onLatest: () => void; onOpenRules: () => void; rulesOpen: boolean; onTargetsView: () => void;
  realData?: boolean; ranking?: { pool: number; rank: number | null; outsideTopTen: boolean };
}) {
  const isST = group.id === 'ST';
  const countdown = <KPIReleaseCountdown calendarDay={calendarDay} />;
  const targets = <CurrentMonthTargets groupId={group.id} setting={filters.daSetting} calendarDay={calendarDay} snapshots={targetSnapshots} onView={onTargetsView} realData={realData} />;
  if (!report) return <div className="monthly-dashboard">{countdown}<section className="configured-card monthly-empty"><h2>Noch kein Monatsabschluss verfügbar</h2><p>Dein Monatsbericht erscheint nach der Veröffentlichung.</p></section><MonthlyPremiumCard report={null} groupId={group.id} /><section id={group.id+'-section-category'} className="monthly-empty-section"><h2>{isST ? 'Jahresübersicht' : 'Jahresfortschritt'}</h2><p>Noch kein Jahresstand verfügbar.</p></section><section id={group.id+'-section-monthly'} />{targets}<PerformanceChart group={group} filters={filters} reports={reports} className="configured-card configured-history" /></div>;
  const annual = annualClosing(reports,report);
  const defaults = groupMetricBlocks(group.id, report.setting);
  const blocks = realData ? group.id==='LH'
    ? Object.entries(Object.groupBy(report.metrics,m=>m.block??(m.key.startsWith('he-')?'HE · 50% des Sell-outs':m.key.startsWith('im-')?'IM · 50% des Sell-outs':'Weitere KPIs'))).map(([label,metrics])=>({label,note:defaults.find(b=>b.label===label)?.note??'Veröffentlichte KPI-Konfiguration',metrics:metrics??[]}))
    : [{...defaults[0],note:'Veröffentlichter Monatsabschluss',metrics:report.metrics}]
    : defaults;
  const rank = realData ? ranking?.rank??null : group.id === 'HE' ? 7 : group.id === 'IM' ? 4 : null;
  const pool = realData ? ranking?.pool??0 : group.id === 'LH' ? 4 : group.id === 'DA' ? 31 : group.id === 'IM' ? 28 : 24;
  const showRank = !isST && pool >= 10;
  const categories = activeReports(reports).filter(r => r.month <= report.month).map(r => ({ id: r.month, label: monthName(r.month), short: monthName(r.month,true)+(r.month.startsWith(annual.year) ? '' : ' '+r.month.slice(2,4)), category: annualClosing(reports,r).level ?? '—' }));
  return <div className="monthly-dashboard">
    {countdown}
    <MonthlyReportSummary report={report} reports={reports} unread={unread} latestUnread={latestUnread} comparison={filters.comparison !== 'none'} onDetails={onDetails} onLatest={onLatest} />
    <MonthlyPremiumCard report={report} groupId={group.id} />
    <section className="monthly-annual-section" id={isST ? undefined : group.id+'-section-category'} aria-labelledby={group.id+'-annual-title'}>
      <header className="monthly-section-heading"><h2 id={group.id+'-annual-title'}>{isST ? 'Jahresübersicht' : 'Jahresfortschritt'}</h2><p>{annual.year} · Stand nach {monthName(report.month).split(' ')[0]}{annual.partial ? ' · unvollständig' : ''}</p></header>
      {isST ? <div className="configured-card st-year-coverage"><strong>{annual.reports.length}</strong><div><h3>veröffentlichte Monatsbewertungen</h3><p>{annual.year} · keine bestätigte Jahrespunkte-Regel</p></div></div> : <>
        <div className={'configured-overview'+(!showRank ? ' without-leaderboard' : '')}><AnnualPointsCard incomplete={realData&&annual.partial} points={annual.points} tier={report.tier} month={monthName(report.month)} currentLevel={annual.level} onOpenRules={onOpenRules} rulesOpen={rulesOpen} flow fullWidth={!showRank} />{showRank && <LeaderboardCard pool={pool} rank={rank} outsideTopTen={realData ? ranking?.outsideTopTen??false : group.id === 'DA'} flow />}</div>
        <AnnualPremiumCard annual={annual} /><CategoryHistoryCard native={realData} groupId={group.id} entries={categories} flow anchor={false} />
      </>}
      {isST && <PerformanceChart group={group} filters={filters} reports={reports} className="configured-card configured-history" />}
    </section>
    <section className="configured-month-section" id={group.id+'-section-monthly'} aria-labelledby={group.id+'-monthly-title'}>
      <header className="monthly-section-heading"><h2 id={group.id+'-monthly-title'}>{isST ? 'Qualitative Monatsdetails' : 'Monatsdetails'}</h2><p>{monthName(report.month)} · Monatsabschluss</p></header>
      {blocks.map((block,index) => {
        const metrics = report.metrics.filter(m => block.metrics.some(b => b.key === m.key) && m.resultState !== 'not-applicable' && (filters.kpi === 'all' || filters.kpi === m.key || filters.kpi === 'below' && m.achievement !== null && m.achievement < 100));
        return <ClosingMetricExplorer key={report.publicationId+'-'+block.label+'-'+filters.kpi} title={group.id==='HE'||group.id==='IM'?'Deine KPIs':block.label} note={block.note} metrics={metrics} report={report} reports={reports} comparison={filters.comparison!=='none'} kind={isST?'criteria':'kpi'} id={isST && index === 0 ? group.id+'-section-category' : undefined}/>;
      })}
      {group.id === 'DA' && report.setting !== 'laundry-ref' && <p className="monthly-stretch-note">VC-Stretch gilt bei mehr als 150%. Betrag und Berechnung sind offen; freigegebene Zusatzprämien stehen separat im Monatsbericht.</p>}
      {!isST && <ClosingMetricExplorer key={report.publicationId+'-qualitative'} title="Softbonus" note={realData?'Gelieferte Kriterien · offene Gewichte bleiben offen.':group.id==='LH'?'Die Gewichtung der einzelnen Kriterien ist noch offen.':'Drei gleich gewichtete Kriterien.'} metrics={report.qualitative} report={report} reports={reports} comparison={filters.comparison!=='none'} kind="criteria"/>}
    </section>
    {targets}
    {!isST && <PerformanceChart group={group} filters={filters} reports={reports} onOpenRules={onOpenRules} rulesOpen={rulesOpen} className="configured-card configured-history" />}
    <p className="configured-data-note">{realData?'Veröffentlichte Monatsabschlüsse und kumulierte Wochenstände.':'Synthetische Monatsabschlüsse und Zielstände · keine echten Personen- oder Auszahlungsdaten.'}</p>
  </div>;
}
