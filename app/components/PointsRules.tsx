'use client';

import { X } from 'lucide-react';
import { ANNUAL_CATEGORY_RULES, MONTHLY_POINTS_RULES, type SECGroup } from '../lib/groups';
import { usePhoneDialog } from './usePhoneDialog';

export function PointsRules({ group, onClose }: { group: SECGroup; onClose: () => void }) {
  const panelRef = usePhoneDialog(onClose);
  return <div className="dashboard-filter-overlay" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dashboard-filter-panel points-rules-panel" ref={panelRef} role="dialog" aria-modal="true" aria-label="Punkte und Kategorien">
      <header className="dashboard-filter-header">
        <div><p>INFO · {group.id} SEC</p></div>
        <button className="filter-close" onClick={onClose} aria-label="Informationen schließen"><X size={32} /></button>
      </header>
      <div className="dashboard-filter-body points-rules-body">
        <h3>Punkte pro Monat</h3>
        <p className="rules-intro">{group.id === 'LH' ? 'Closing-Referenz: 85% Leistung (je 50% HE/IM) + 15% Softbonus; Freigabe offen.' : 'Monatsleistung: 85% Sell-out + 15% Softbonus.'} Für Punkte müssen beide Werte die jeweilige Schwelle erreichen.</p>
        <div className="monthly-rules-list">
          {MONTHLY_POINTS_RULES.map(rule => <article className="points-rule" key={rule.label}>
            <div className="rule-value"><strong>{rule.points}</strong><span>{rule.points === 1 ? 'Punkt' : 'Punkte'}</span></div>
            <div className="rule-copy"><h4>{rule.label}</h4><p>Sell-out <b>{rule.sellout}</b> deines Ziels<br /><span>UND</span> Softbonus <b>{rule.softbonus}</b></p></div>
          </article>)}
        </div>
        <p className="rules-exception">Wenn nur einer der beiden Werte unter 90% liegt, ist die Punktevergabe noch nicht geklärt.</p>
        <h3>Deine Jahreskategorie</h3>
        <p className="rules-intro">Die Summe deiner Monatspunkte aus den letzten 12 Monaten bis zum gewählten Abschluss. Der Stand rollt mit jedem neuen Monat weiter.</p>
        <dl className="annual-rules-list">
          {ANNUAL_CATEGORY_RULES.map(rule => <div key={rule.label}><dt>{rule.label}</dt><dd>{rule.range}</dd></div>)}
        </dl>
        <p className="rules-year-limit">Maximal 3 Punkte × 12 Monate = <b>36 Punkte</b></p>
      </div>
    </div>
  </div>;
}
