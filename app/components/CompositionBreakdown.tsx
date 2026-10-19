import type { SECGroup } from '../lib/groups';

export function CompositionBreakdown({ group, className = '' }: { group: SECGroup; className?: string }) {
  const isST = group.id === 'ST';
  return <section className={`configured-card configured-composition ${className}`.trim()} aria-label={isST ? '100 Prozent qualitative Bewertung' : '85 Prozent Sell-out und 15 Prozent Softbonus'}>
    <h3>{isST ? '100% qualitative Bewertung' : 'Zusammensetzung'}</h3>
    <div className="configured-weight-bar" aria-hidden="true">{!isST && <span style={{ width: '85%' }} />}<i style={{ width: isST ? '100%' : '15%' }} /></div>
    <p>{!isST && <span><b>85%</b> Sell-out</span>}<span><b>{isST ? '100%' : '15%'}</b> Softbonus</span></p>
    {group.id === 'LH' && <small>Sell-out = 50% HE + 50% IM · Closing-Referenz, aktuelle Freigabe offen</small>}
    {isST && <small>Kein quantitativer Verkaufsblock · Kriterienstand Juni 2026</small>}
  </section>;
}
