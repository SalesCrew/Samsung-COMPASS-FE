import type { CSSProperties } from 'react';
import { softbonusDots, softbonusGap } from '../lib/softbonus';

export function SoftbonusOverviewCard({ value, month, criteriaCount }: {
  value: number | null; month: string; criteriaCount: number;
}) {
  return <section className="ui-card overview-flow-card softbonus-overview-card" aria-label={value !== null ? `${value} Prozent Softbonus` : 'Softbonus noch nicht verfügbar'}>
    <header className="softbonus-overview-context"><span>Qualitative Leistung</span><span>{month}<i aria-hidden="true" />Demo</span></header>
    <div className="softbonus-overview-ring">
      <div aria-hidden="true">{softbonusDots(value).map((dot, index) => <span key={index} className={`constellation-dot softbonus-overview-dot${dot.current ? ' is-current' : ''}`} style={{ '--dot-angle': `${dot.angle}deg`, '--dot-size': `${dot.size}px`, '--softbonus-fill': `${dot.fill * 100}%` } as CSSProperties} />)}</div>
      <div className="softbonus-overview-copy">
        <div className="softbonus-overview-value"><strong>{value === null ? '—' : value.toLocaleString('de-AT', { maximumFractionDigits: 1 })}</strong>{value !== null ? <span>%</span> : null}</div>
        <p>Softbonus</p>
        <small>{softbonusGap(value)}</small>
      </div>
    </div>
    <footer className="softbonus-overview-footer"><span><strong>{criteriaCount}</strong> Kriterien</span><i aria-hidden="true" /><span><strong>100%</strong> qualitativ</span></footer>
  </section>;
}
