import { Euro } from 'lucide-react';
import { euro, lastCompletedBonus } from '../lib/demo';
import type { SECGroup } from '../lib/groups';
import { MonthTimeline } from './MonthTimeline';

export function IncentiveCard({ group, month, asOf, className = '' }: {
  group: SECGroup;
  month: string;
  asOf: string;
  className?: string;
}) {
  const value = lastCompletedBonus(group.id);
  const isST = group.id === 'ST';
  return <section className={`incentive-card ${className}`.trim()} aria-label={value ? `${isST ? 'Offenes Prämienmodell, synthetischer letzter Bonus' : 'Letzter abgeschlossener Bonus'}: ${euro(value.premiumCurrent)} Euro, Demo` : 'Noch kein abgeschlossener Bonus verfügbar'}>
    <header className="incentive-heading">
      <span className="incentive-icon"><Euro size={32} strokeWidth={1.65} /></span>
      <p>{isST ? 'Prämienmodell' : 'Letzter Bonus'}</p>
      <span className="incentive-demo">DEMO</span>
    </header>
    <div className="incentive-main">
      <div className="incentive-amount">
        {isST && <small>Letzter Bonus · Modell offen</small>}
        <div><strong>{value ? euro(value.premiumCurrent) : '—'}</strong><span>{value && '€'}</span></div>
        {value && !isST && <p>{group.id === 'LH' ? 'Kein On-top' : <><b>+{euro(value.onTop)} €</b> · On-top separat</>}</p>}
      </div>
      <div className="incentive-ytd">
        <small>{isST ? 'Modellwert 2026' : 'Gesamt 2026'}</small>
        <strong>{value ? euro(value.premiumYtd) : '—'} <span>{value && '€'}</span></strong>
      </div>
    </div>
    <MonthTimeline month={month} asOf={asOf} />
  </section>;
}
