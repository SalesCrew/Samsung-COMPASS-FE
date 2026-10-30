import type { CSSProperties } from 'react';
import { monthName, type GroupId, type MonthlyReport, type rollingPremiums } from '../lib/monthlyClosing';
const money = (n: number) => new Intl.NumberFormat('de-AT', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n);
const amountStyle=(...values:(number|null|undefined)[])=>({'--premium-characters':Math.max(1,...values.map(value=>value==null?1:money(value).length))} as CSSProperties);
export function MonthlyPremiumCard({ report, groupId }: { report: MonthlyReport | null; groupId: GroupId }) {
  const isST = groupId === 'ST' && (!report || report.premium === null);
  const extras = report && report.extrasAvailable!==false ? report.extras.reduce((sum, extra) => sum + extra.amount, 0) : null;
  return <section className="configured-card monthly-premium-card" aria-label={isST ? 'Prämienmodell noch nicht bestätigt' : `Monatsprämie ${report ? monthName(report.month) : ''}`} data-premium-report={report?.publicationId}>
    <header className="premium-heading"><div><h2>{isST ? 'Prämienmodell' : 'Monatsprämie'}</h2><p>{report ? monthName(report.month) : 'Noch kein Monatsabschluss'}</p></div>{report?.reportId.startsWith('demo-')&&<small>DEMO</small>}</header>
    {isST ? <p className="premium-unavailable">Prämienmodell noch nicht bestätigt</p> : <div className="premium-split" style={amountStyle(report?.premium,extras)}>
      <div className="premium-column"><h3>Hauptprämie</h3>
        {report?.premium === null || !report ? <p className="premium-unavailable">Prämie noch nicht verfügbar</p> : <div className="monthly-premium-amount" data-has-premium={report.premium > 0}><strong>{money(report.premium)}</strong><span>€</span></div>}
        {report?.premium !== null && report && <p className="premium-column-note">Freigegeben</p>}
      </div>
      <div className="premium-column"><h3>Zusatzprämie</h3>
        <div className="monthly-premium-amount premium-extra-amount"><strong>{extras === null ? '—' : money(extras)}</strong>{extras !== null && <span>€</span>}</div>
        {report?.extras.length ? <div className="premium-extras">{report.extras.map(extra => <p key={extra.type}><span>{extra.type}</span>{' '}<b>{money(extra.amount)} €</b></p>)}</div> : <p className="premium-column-note">{report ? extras===null?'Zusatzprämie noch nicht verfügbar':'Keine Zusatzprämie' : 'Noch kein Monatsabschluss'}</p>}
      </div>
    </div>}
  </section>;
}
export function AnnualPremiumCard({ premiums }: { premiums: ReturnType<typeof rollingPremiums> }) {
  return <section className="configured-card annual-premium-card" aria-label="Prämien · letzte 12 Monate">
    <header className="premium-heading"><div><h2>Prämien · letzte 12 Monate</h2><p>{monthName(premiums.fromMonth)} – {monthName(premiums.throughMonth)}</p></div></header>
    <div className="premium-split" style={amountStyle(premiums.premium,premiums.extras)}>
      <div className="premium-column"><h3>Hauptprämie</h3><div className="annual-premium-amount" data-has-premium={premiums.premium !== null && premiums.premium > 0}><strong>{premiums.premium === null ? '—' : money(premiums.premium)}</strong>{premiums.premium !== null && <span>€</span>}</div>{premiums.knownMonths<12&&<p className="premium-column-note">{premiums.knownMonths} von 12 Monaten verfügbar</p>}</div>
      <div className="premium-column"><h3>Zusatzprämie</h3><div className="annual-premium-amount premium-extra-amount"><strong>{premiums.extras===null?'—':money(premiums.extras)}</strong>{premiums.extras!==null&&<span>€</span>}</div><p className="premium-column-note">{premiums.extrasKnownMonths<12?`${premiums.extrasKnownMonths} von 12 Monaten verfügbar`:(premiums.extras??0)>0?'Separat':'Keine Zusatzprämie'}</p></div>
    </div>
  </section>;
}
