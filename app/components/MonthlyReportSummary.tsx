import { ArrowUpRight, Check, Sparkles } from 'lucide-react';
import { compareClosing, monthName, publicationDate, type MonthlyReport } from '../lib/monthlyClosing';
import { TIER_LABELS } from '../lib/groups';
import { SoftbonusOverviewCard } from './SoftbonusOverview';
export function MonthlyReportSummary({ report, reports, unread, latestUnread, comparison, onDetails, onLatest }: {
  report: MonthlyReport; reports: readonly MonthlyReport[]; unread: boolean; latestUnread: MonthlyReport | null;
  comparison: boolean; onDetails: () => void; onLatest: () => void;
}) {
  const isST = report.groupId === 'ST';
  return <section className={`configured-card monthly-report-summary${isST ? ' is-qualitative' : ''}`} data-report={report.publicationId} aria-label={`Monatsergebnis ${monthName(report.month)}`}>
    <div className={`publication-context${unread || latestUnread ? ' is-new' : ''}`}>
      <span>{unread || latestUnread ? <Sparkles size={23} strokeWidth={1.5} /> : <Check size={23} strokeWidth={1.5} />}
        {latestUnread ? `${monthName(latestUnread.month)} ist neu verfügbar.` : unread ? report.revision > 1 ? `${monthName(report.month)} wurde aktualisiert.` : `Neu: ${monthName(report.month)} ist verfügbar.` : `Veröffentlicht am ${publicationDate(report.publishedAt)}`}</span>
      <button type="button" onClick={latestUnread ? onLatest : onDetails}>{latestUnread ? 'Anzeigen' : 'Monatsdetails'}<ArrowUpRight size={23} /></button>
    </div>
    {isST ? <SoftbonusOverviewCard value={report.softbonus} month={monthName(report.month)} criteriaCount={report.qualitative.length} /> : <>
      <div className="monthly-result-panes">{(['sellout', 'softbonus'] as const).map(key => {
        const delta = comparison ? compareClosing(report, reports, key) : null;
        return <div className="summary-pane" data-series={key} key={key}>
          <p>{key === 'sellout' ? report.groupId === 'LH' ? 'Sell-out kombiniert' : 'Sell-out' : 'Softbonus'}</p>
          <strong>{report[key] === null ? '—' : report[key]!.toLocaleString('de-AT', { maximumFractionDigits: 1 })}{report[key] !== null && <span>%</span>}</strong>
          <small>{delta ? `${delta.value > 0 ? '+' : ''}${delta.value.toLocaleString('de-AT')} Pp. zum ${monthName(delta.month, true)}` : report[key] === null ? 'Noch kein Wert' : report.groupId === 'LH' && key === 'sellout' ? 'HE + IM' : 'Monatsabschluss'}</small>
        </div>;
      })}</div>
      <div className="monthly-category"><span>{report.points === null ? 'Monatskategorie noch nicht verfügbar' : `${TIER_LABELS[report.tier]} · ${report.points} ${report.points === 1 ? 'Monatspunkt' : 'Monatspunkte'}`}</span>{report.reportId.startsWith('demo-')&&<small>DEMO</small>}</div>
    </>}
  </section>;
}
