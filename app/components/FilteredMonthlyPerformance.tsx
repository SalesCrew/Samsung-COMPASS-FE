import { Euro, House, Info, Monitor, Speaker } from 'lucide-react';
import { matchesKpi, monthlyView, shortDate, STATUS_LABELS, type DashboardFilters } from '../lib/dashboard';
import type { SECGroup } from '../lib/groups';

const KPIS = [
  { key: 'units', title: 'TV Units', actual: '53', target: '50', achievement: 106, weight: 30, Icon: Monitor },
  { key: 'soundbar', title: 'Soundbar', actual: '14', target: '18', achievement: 78, weight: 15, Icon: Speaker },
  { key: 'asp', title: 'TV ASP', actual: '€927', target: '€900', achievement: 103, weight: 20, Icon: Euro },
  { key: 'share', title: 'In-house Share', actual: '48 %', target: '50 %', achievement: 96, weight: 35, Icon: House },
] as const;

export function FilteredMonthlyPerformance({ filters, group }: { filters: DashboardFilters; group: SECGroup }) {
  const view = monthlyView(filters);
  const selected = KPIS.filter(kpi => matchesKpi(kpi.key, filters));
  const format = (n: number) => n.toLocaleString('de-AT', { maximumFractionDigits: 1 });
  return <section className="monthly-page-section" id={`${group.id}-section-monthly`} aria-labelledby={`${group.id}-monthly-title`}>
    <header className="monthly-header">
      <h2 id={`${group.id}-monthly-title`}>Monatsleistung</h2>
      <p>{group.id} <span>·</span> {view.monthLabel} <span>·</span> Stand {shortDate(view.asOf)}</p>
      <small>{view.available ? STATUS_LABELS[view.status] : 'Kein passender Datenstand'}</small>
    </header>
    <section className="monthly-card monthly-summary-card" aria-label="Monatszusammenfassung">
      <div className="summary-pane summary-pane-current"><strong>{view.overall === null ? '—' : format(view.overall)}{view.overall !== null && <span>%</span>}</strong><p>Zielerreichung</p></div>
      <div className="summary-pane summary-pane-delta"><strong>{view.delta === null ? '—' : `+${format(view.delta)}`}{view.delta !== null && <span> Pp.</span>}</strong><p>{view.comparisonLabel}</p>{view.delta === null && filters.comparison !== 'none' && <small className="comparison-unavailable">Kein vergleichbarer Gesamtstand</small>}</div>
    </section>
    <div className="filtered-monthly-content">
      {view.hasDetails || view.targetOnly ? <>
        <p className="filtered-monthly-caption">{view.targetOnly ? 'Targets geladen · noch keine Actuals' : 'Deine gefilterten KPI-Details'}</p>
        {view.targetOnly && filters.kpi === 'below' ? <div className="filtered-kpi-row"><p>Ohne Actuals lässt sich noch nicht feststellen, welche KPIs unter 100 % liegen.</p></div> : selected.map(kpi => <article className="filtered-kpi-row" key={kpi.key}>
          <span className="filtered-kpi-icon"><kpi.Icon size={40} strokeWidth={1.6} /></span>
          <div><h3>{kpi.title}</h3><p><b>{view.targetOnly ? '—' : kpi.actual}</b> / {kpi.target} <small>· {kpi.weight} % Gewicht</small></p></div>
          <strong className={kpi.achievement >= 100 ? 'is-achieved' : ''}>{view.targetOnly ? '—' : `${kpi.achievement}%`}</strong>
        </article>)}
        <p className="filtered-monthly-caption">{view.targetOnly ? 'Actuals erscheinen mit dem ersten Wochenupdate.' : 'Der Gesamtwert enthält weiterhin alle KPIs.'}</p>
      </> : <div className="filtered-monthly-empty">
        <Info size={40} strokeWidth={1.5} />
        <h3>{view.available ? 'Keine KPI-Details zu diesem Stand' : 'Kein Stand für diesen Filter'}</h3>
        <p>{view.available ? 'In dieser Vorschau sind die vollständigen KPI-Details am 24.09. verfügbar. Die vorhandenen Verlaufswerte bleiben im Chart sichtbar.' : 'Passe den Datenstatus oder den Berichtsmonat im Filter an.'}</p>
      </div>}
    </div>
    <p className="monthly-data-status"><Info size={22} strokeWidth={1.6} />Beispieldaten <span>·</span> {shortDate(view.asOf)}2026 <span>·</span> {STATUS_LABELS[view.status]}</p>
  </section>;
}
