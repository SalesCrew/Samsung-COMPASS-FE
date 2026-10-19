'use client';

import { useId, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, ClipboardCheck, Euro, Headphones, House, Monitor, Refrigerator, Smartphone, Speaker, Tablet, WashingMachine, Watch, Wind } from 'lucide-react';
import { activeReports, monthName, previousMonth, publicationDate, type ClosingMetric, type MonthlyReport } from '../lib/monthlyClosing';

const ICONS = { tv: Monitor, speaker: Speaker, euro: Euro, home: House, phone: Smartphone, watch: Watch, tablet: Tablet, headphones: Headphones, laundry: WashingMachine, fridge: Refrigerator, vacuum: Wind, check: ClipboardCheck };
const number = (n: number) => n.toLocaleString('de-AT', { maximumFractionDigits: 1 });
const weight = (n: number | null) => n === null ? 'Gewicht offen' : n === 100/3 ? '⅓ Gewicht' : number(n)+'% Gewicht';
const result = (m: ClosingMetric) => m.resultState === 'invalid' ? 'Wert nicht verfügbar' : m.achievement === null ? 'Noch kein Wert' : number(m.achievement)+'%';

export function ClosingMetricExplorer({ title, note, metrics, report, reports, kind = 'kpi', comparison = true, id }: {
  title: string; note: string; metrics: readonly ClosingMetric[]; report: MonthlyReport; reports: readonly MonthlyReport[];
  kind?: 'kpi' | 'criteria'; comparison?: boolean; id?: string;
}) {
  const headingId = useId();
  const [selected, setSelected] = useState<string | null>(null);
  const overview = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const detail = metrics.find(m => m.key === selected) ?? null;
  const prior = comparison ? activeReports(reports).find(r => r.month === previousMonth(report.month) && r.configurationVersion === report.configurationVersion) : undefined;
  const previous = prior && (kind === 'criteria' ? prior.qualitative : prior.metrics).find(m => m.key === selected);
  const delta = detail?.achievement !== null && detail?.achievement !== undefined && previous?.achievement !== null && previous?.achievement !== undefined ? Math.round((detail.achievement-previous.achievement)*10)/10 : null;
  function open(key: string) { setSelected(key); requestAnimationFrame(()=>back.current?.focus({preventScroll:true})); }
  function close() {
    const key = selected;
    setSelected(null);
    requestAnimationFrame(()=>Array.from(overview.current?.querySelectorAll<HTMLButtonElement>('button')??[]).find(b=>b.dataset.metric===key)?.focus({preventScroll:true}));
  }
  return <section className={'configured-card closing-metrics'+(kind==='criteria'?' is-criteria':'')} id={id} aria-labelledby={headingId} data-metric-view={detail?'detail':'overview'} onKeyDown={e=>{if(e.key==='Escape'&&detail){e.preventDefault();close();}}}>
    <header className="closing-metrics-heading"><div><h3 id={headingId}>{title}</h3><p>{monthName(report.month)}</p></div><span>{metrics.length} {kind==='criteria'?'Kriterien':'KPIs'}</span></header>
    {detail ? <div className="closing-metric-detail">
      <button type="button" className="closing-metric-back" ref={back} onClick={close}><ArrowLeft size={25}/>{kind==='criteria'?'Alle Kriterien':'Alle KPIs'}</button>
      <div className="closing-metric-result" data-result-state={detail.resultState} data-threshold-reached={detail.achievement !== null && detail.achievement >= 90}><span className="closing-metric-detail-icon">{(()=>{const Icon=ICONS[detail.icon];return <Icon size={37} strokeWidth={1.65}/>;})()}</span><h4>{detail.label}</h4><strong>{result(detail)}</strong><p>{kind==='criteria'?'Qualitative Bewertung':'Zielerreichung'} · Monatsabschluss</p></div>
      <dl className="closing-metric-facts">
        {detail.actual !== null && <div><dt>Ist</dt><dd>{number(detail.actual)} <small>{detail.unit}</small></dd></div>}
        {detail.target !== null && <div><dt>Ziel</dt><dd>{number(detail.target)} <small>{detail.unit}</small></dd></div>}
        <div className={detail.actual===null && detail.target===null?'full-width':undefined}><dt>Gewichtung</dt><dd>{detail.weight===null?'Noch offen':detail.weight===100/3?'⅓':number(detail.weight)+'%'}</dd></div>
        {detail.actual !== null && detail.target !== null && <div><dt>Abstand zum Ziel</dt><dd>{number(detail.actual-detail.target)} <small>{detail.unit==='%'?'Pp.':detail.unit}</small></dd></div>}
      </dl>
      {delta !== null && prior && <div className="closing-metric-comparison"><span>{monthName(prior.month)}<b>{number(previous!.achievement!)}%</b></span><span>Veränderung<b>{delta>0?'+':''}{number(delta)} Pp.</b></span></div>}
      {detail.actual === null && detail.target === null && detail.achievement !== null && <p className="closing-metric-note">Prozentwert laut Monatsabschluss. Keine separaten Ist- und Zielwerte verfügbar.</p>}
      <p className="closing-metric-note">{note}</p><p className="closing-metric-publication">Veröffentlicht am {publicationDate(report.publishedAt)}{report.revision>1?' · korrigiert':''}</p>
    </div> : <>
      <div className="closing-metric-grid" ref={overview}>{metrics.map(m=><button type="button" className="closing-metric-tile" key={m.key} data-metric={m.key} data-result-state={m.resultState} data-threshold-reached={m.achievement !== null && m.achievement >= 90} onClick={()=>open(m.key)} aria-label={m.label+': '+result(m)+'. Details anzeigen'}>
        <span className="closing-metric-label"><span>{m.label}</span><ChevronRight size={21} className="closing-metric-chevron"/></span>
        <strong>{result(m)}</strong>
        {m.actual !== null && m.target !== null ? <span className="closing-metric-ratio">Ist {number(m.actual)} <span>/</span> Ziel {number(m.target)} {m.unit}</span> : <span className="closing-metric-ratio">{m.achievement===null?'Ergebnis ausstehend':'Monatsabschluss'}</span>}
        <small>{weight(m.weight)}</small>
      </button>)}</div>
      {!metrics.length && <p className="closing-metric-note">Keine passenden {kind==='criteria'?'Kriterien':'KPIs'} für diesen Fokus.</p>}
      <p className="closing-metric-hint">{kind==='criteria'?'Kriterium':'KPI'} antippen, um Details anzuzeigen</p>
    </>}
  </section>;
}
