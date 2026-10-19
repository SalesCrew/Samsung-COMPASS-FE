import type { CSSProperties } from 'react';
import { monthName, type GroupId, type MonthlyReport, type annualClosing } from '../lib/monthlyClosing';
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
export function AnnualPremiumCard({ annual }: { annual: ReturnType<typeof annualClosing> }) {
  return <section className="configured-card annual-premium-card" aria-label={`Hauptprämien ${annual.year}`} data-annual-basis={annual.publicationSetId}>
    <header className="premium-heading"><div><h2>Hauptprämien {annual.year}</h2></div></header>
    <div className="premium-split" style={amountStyle(annual.premium,annual.extras)}>
      <div className="premium-column"><h3>Hauptprämie</h3><div className="annual-premium-amount" data-has-premium={annual.premium !== null && annual.premium > 0}><strong>{annual.premium === null ? '—' : money(annual.premium)}</strong>{annual.premium !== null && <span>€</span>}</div></div>
      <div className="premium-column"><h3>Zusatzprämie</h3><div className="annual-premium-amount premium-extra-amount"><strong>{annual.extras===null?'—':money(annual.extras)}</strong>{annual.extras!==null&&<span>€</span>}</div><p className="premium-column-note">{annual.extras===null?'Noch nicht verfügbar':annual.extras>0?'Separat':'Keine Zusatzprämie'}</p></div>
    </div>
  </section>;
}
