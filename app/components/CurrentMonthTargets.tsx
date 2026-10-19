'use client';

import { useRef, useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { groupMetricBlocks, type DASetting, type SECGroup } from '../lib/groups';
import { monthName, publicationDate } from '../lib/monthlyClosing';
import { currentTargets, targetAchievement, targetProgressHistory, type WeeklyTargetSnapshot } from '../lib/weeklyTargets';

const number = (n: number) => n.toLocaleString('de-AT', { maximumFractionDigits: 1 });
const signedChange = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '±') + number(Math.abs(n));
const changeDirection = (n: number) => n > 0 ? 'up' : n < 0 ? 'down' : 'unchanged';

export function CurrentMonthTargets({ groupId, setting, calendarDay, snapshots, onView, realData=false }: {
  groupId: SECGroup['id']; setting: DASetting; calendarDay: string; snapshots: readonly WeeklyTargetSnapshot[]; onView: () => void; realData?: boolean;
}) {
  const snapshot = currentTargets(snapshots, groupId, setting, calendarDay);
  const titleId = groupId + '-targets-title';
  const isST = groupId === 'ST';
  const context = groupId + '-' + setting + '-' + calendarDay.slice(0, 7);
  const [selection, setSelection] = useState<{ context: string; key: string } | null>(null);
  const overview = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const surface = useRef<HTMLElement>(null);
  const overviewPosition = useRef(0);
  const detail = selection?.context === context ? snapshot?.metrics.find(metric => metric.key === selection.key) : null;
  const history = detail ? targetProgressHistory(snapshots, groupId, setting, calendarDay, detail.key) : [];
  const currentStand = history.find(stand => stand.asOf === snapshot?.asOf);
  const detailAchievement = detail ? targetAchievement(detail.actual, detail.target) : null;
  function open(key: string) {
    overviewPosition.current = surface.current?.closest('.phone-scroll-region')?.scrollTop ?? 0;
    setSelection({ context, key });
    requestAnimationFrame(() => { onView(); back.current?.focus({ preventScroll: true }); });
  }
  function close() {
    const key = selection?.key;
    setSelection(null);
    requestAnimationFrame(() => {
      const region = surface.current?.closest('.phone-scroll-region');
      if (region) region.scrollTop = overviewPosition.current;
      Array.from(overview.current?.querySelectorAll<HTMLButtonElement>('button') ?? []).find(button => button.dataset.goal === key)?.focus({ preventScroll: true });
    });
  }
  return <section ref={surface} id={groupId + '-section-targets'} className="configured-card current-targets" aria-labelledby={titleId} tabIndex={-1} data-target-view={detail ? 'detail' : 'overview'} data-target-month={calendarDay.slice(0, 7)} data-target-snapshot={snapshot?.id} onKeyDown={event => { if (event.key === 'Escape' && detail) { event.preventDefault(); event.stopPropagation(); close(); } }}>
    <header className="current-targets-heading"><div><h2 id={titleId}>Monatliche Ziele</h2><p>{monthName(calendarDay.slice(0, 7))} <span>· laufender Monat</span></p></div><span className="current-targets-cadence">{isST ? 'Zielstand' : 'Wöchentlich'}</span></header>
    <dl className="current-targets-update"><div><dt>Letzte Aktualisierung</dt><dd>{snapshot ? <time dateTime={snapshot.updatedAt}>{publicationDate(snapshot.updatedAt)}</time> : 'Noch ausstehend'}</dd></div>{snapshot && publicationDate(snapshot.asOf) !== publicationDate(snapshot.updatedAt) && <div><dt>Datenstand</dt><dd><time dateTime={snapshot.asOf}>{publicationDate(snapshot.asOf)}</time></dd></div>}</dl>
    {snapshot ? detail ? <div className="weekly-target-detail">
      <button type="button" className="closing-metric-back" ref={back} onClick={close}><ArrowLeft size={25} aria-hidden="true"/>Alle Ziele</button>
      <div className="weekly-target-summary"><div><h3>{detail.label}</h3><p>Wochenverlauf · {monthName(snapshot.month)}</p></div><strong className="current-target-achievement" data-result-available={detailAchievement !== null} data-threshold-reached={detailAchievement !== null && detailAchievement >= 90}>{detailAchievement === null ? 'Noch kein Ist' : number(detailAchievement) + '%'}</strong></div>
      <dl className="weekly-target-facts"><div><dt>Ist im Monat</dt><dd>{detail.actual === null ? 'Ausstehend' : <>{number(detail.actual)} <small>{detail.unit}</small></>}{detail.actual !== null && (currentStand?.change != null && currentStand.previousAsOf ? <span className="weekly-target-change" data-change-direction={changeDirection(currentStand.change)}>{signedChange(currentStand.change)} {detail.unit === '%' ? 'Pp.' : detail.unit}<span>zum Stand <time dateTime={currentStand.previousAsOf}>{publicationDate(currentStand.previousAsOf).slice(0, 6)}</time></span></span> : <span className="weekly-target-change">Noch kein Vergleich</span>)}</dd></div><div><dt>Monatsziel</dt><dd>{detail.target === null ? 'Noch offen' : <>{number(detail.target)} <small>{detail.unit}</small></>}</dd></div></dl>
      {history.some(stand => stand.achievement !== null) ? <WeeklyTargetChart history={history} label={detail.label}/> : <p className="current-targets-empty">Noch kein Wochenstand verfügbar.{isST ? ' Qualitative Istwerte folgen mit dem Monatsabschluss.' : ''}</p>}
      <table className="weekly-target-history"><caption>Wochenstände · kumuliert im Monat</caption><thead><tr><th scope="col">Stand</th><th scope="col">Ist ({detail.unit})<span className="weekly-target-change-label">Änderung{detail.unit === '%' ? ' (Pp.)' : ''}</span></th><th scope="col">Ziel ({detail.unit})</th><th scope="col">Erreicht</th></tr></thead><tbody>{history.map(stand => <tr key={stand.asOf}><th scope="row"><time dateTime={stand.asOf}>{publicationDate(stand.asOf).slice(0, 6)}</time></th><td>{stand.actual === null ? <><span aria-hidden="true">—</span><span className="sr-only">Noch ausstehend</span></> : <>{number(stand.actual)}{stand.unit!==detail.unit&&<small> {stand.unit}</small>}<span className="weekly-target-change" data-change-direction={stand.change === null ? undefined : changeDirection(stand.change)}>{stand.change === null ? <><span aria-hidden="true">—</span><span className="sr-only">Kein vergleichbarer vorheriger Stand</span></> : <>{signedChange(stand.change)}<span className="sr-only"> {detail.unit === '%' ? 'Prozentpunkte' : detail.unit} zum vorherigen Stand</span></>}</span></>}</td><td>{stand.target === null ? '—' : number(stand.target)}</td><td className={stand.achievement === null ? undefined : 'current-target-achievement'} data-threshold-reached={stand.achievement !== null && stand.achievement >= 90}>{stand.achievement === null ? '—' : number(stand.achievement) + '%'}</td></tr>)}</tbody></table>
      <p className="current-targets-note">{realData?'Jeder Stand zeigt den Monat bis zum angegebenen Datum.':'Demo · jeder Stand zeigt den Monat bis zum angegebenen Datum.'}</p>
    </div> : <div ref={overview}>
      {(realData?(groupId==='LH'?Object.entries(Object.groupBy(snapshot.metrics,m=>m.block??(m.key.startsWith('he-')?'HE':'IM'))).map(([label,metrics])=>({label,metrics:metrics??[]})):[{label:'Monatliche Ziele',metrics:snapshot.metrics}]):groupMetricBlocks(groupId, setting)).map(block => {
        const metrics = snapshot.metrics.filter(metric => block.metrics.some(definition => definition.key === metric.key));
        return <div className="current-targets-block" key={block.label}>
          {groupId === 'LH' && <h3>{block.label.startsWith('HE') ? 'HE' : 'IM'}</h3>}
          <div className="current-targets-columns" aria-hidden="true"><span>{isST ? 'Kriterium / Ist' : 'KPI / Ist im Monat'}</span><span>Monatsziel</span></div>
          <ul aria-label={(groupId === 'LH' ? block.label.slice(0, 2) + ' · ' : '') + 'Ziele ' + monthName(snapshot.month)}>{metrics.map(metric => {
            const achievement = targetAchievement(metric.actual, metric.target);
            return <li key={metric.key} data-target-metric={metric.key}><button type="button" className="current-target-row" data-goal={metric.key} onClick={() => open(metric.key)} aria-label={metric.label + ' · Wochenverlauf anzeigen'}>
              <span className="current-target-name"><span className="current-target-label">{metric.label}</span><span className="current-target-actual">{metric.actual === null ? 'Ist noch ausstehend' : <>Ist <b>{number(metric.actual)} {metric.unit}</b></>}</span></span>
              <span className="current-target-value"><strong><span className="sr-only">Monatsziel </span>{metric.target === null ? 'Noch offen' : <>{number(metric.target)} <small>{metric.unit}</small></>}</strong>{achievement !== null && <span className="current-target-achievement" data-threshold-reached={achievement >= 90}>{number(achievement)}%<span className="sr-only"> des Monatsziels erreicht</span></span>}</span><ChevronRight size={23} aria-hidden="true"/>
              </button>
            </li>;
          })}</ul>
          {!metrics.length && <p className="current-targets-empty">Für diesen Bereich liegen noch keine Monatsziele vor.</p>}
        </div>;
      })}
      <p className="current-targets-note">{realData ? 'Kumulierter Monatsstand · zuletzt veröffentlichte Aktualisierung.' : isST ? 'Demo · qualitative Istwerte folgen mit dem Monatsabschluss.' : 'Demo · kumulierter Monatsstand, wöchentlich aktualisiert.'}</p>
      <p className="closing-metric-hint">Ziel antippen, um den Wochenverlauf zu sehen</p>
    </div> : <p className="current-targets-empty">Für {monthName(calendarDay.slice(0, 7))} liegen noch keine Monatsziele vor.</p>}
  </section>;
}

function WeeklyTargetChart({ history, label }: { history: ReturnType<typeof targetProgressHistory>; label: string }) {
  const ceiling = Math.max(100, ...history.map(stand => stand.achievement ?? 0));
  const points = history.map((stand, index) => ({ ...stand, x: history.length === 1 ? 310 : 40 + index * 540 / (history.length - 1), y: stand.achievement === null ? null : 160 - stand.achievement / ceiling * 130 }));
  const path = points.map((point, index) => point.y === null ? '' : ((points[index - 1]?.y ?? null) === null ? 'M' : 'L') + point.x + ',' + point.y).join(' ');
  const targetY = 160 - 100 / ceiling * 130;
  return <figure className="weekly-target-chart" aria-label={'Wochenverlauf ' + label}><figcaption>Zielerreichung im laufenden Monat</figcaption><svg viewBox="0 0 620 205" aria-hidden="true"><line x1="40" x2="580" y1={targetY} y2={targetY} className="weekly-target-reference"/><text x="40" y={targetY - 12} className="weekly-target-reference-label">100% Ziel</text><path d={path} className="weekly-target-line"/>{points.map((point,index) => <g key={point.asOf}>{point.y !== null && <><circle cx={point.x} cy={point.y} r="6" className="weekly-target-dot"/><text x={point.x} y={point.y - 14} textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'} className="weekly-target-chart-value" data-threshold-reached={point.achievement! >= 90}>{number(point.achievement!)}%</text></>}<text x={point.x} y="193" textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'} className="weekly-target-date">{publicationDate(point.asOf).slice(0, 6)}</text></g>)}</svg></figure>;
}
