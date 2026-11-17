'use client';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight, Info, List } from 'lucide-react';
import { PhoneSelect } from './PhoneSelect';
import { performanceHistory, type PerformanceHistoryRow as Row } from '../lib/performanceHistory';
import { chartRatio, signedChartAxis } from '../lib/signedChart';
import { monthName, publicationDate, type MonthlyReport } from '../lib/monthlyClosing';
import type { DashboardFilters } from '../lib/dashboard';
import type { SECGroup } from '../lib/groups';
import './performanceHistory.css';
type Series='sellout'|'softbonus';
type ChartProps={id?:number;rows:Row[];selected:string;onSelect:(month:string)=>void;st:boolean};
const number=(n:number)=>n.toLocaleString('de-AT',{maximumFractionDigits:1});
const percent=(n:number|null)=>n===null?'—':number(n)+' %';
const seriesColor=(s:Series)=>s==='sellout'?'var(--sec-blue)':'var(--sec-green)';
const seriesKeys=(st:boolean):Series[]=>st?['softbonus']:['sellout','softbonus'];
const svgWidth=320;
const names={sellout:'Sell-out',softbonus:'Softbonus'};
function selectWithKeys(event: KeyboardEvent, rows: Row[], selected: string, onSelect: ChartProps['onSelect']) {
  const index = rows.findIndex(r => r.month === selected);
  let next = index;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = Math.min(rows.length - 1, index + 1);
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = Math.max(0, index - 1);
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = rows.length - 1;
  else return;
  event.preventDefault(); onSelect(rows[next].month);
}

function BarPlot({ rows, selected, onSelect, st, focus, axis, scrollable = false }: Omit<ChartProps, 'id'> & { focus?: Series; axis: ReturnType<typeof signedChartAxis>; scrollable?: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const [viewportWidth, setViewportWidth] = useState(0);
  const single = rows.filter(r => r.sellout !== null || r.softbonus !== null).length === 1;
  const shown = single ? rows.filter(r => r.sellout !== null || r.softbonus !== null) : rows;
  const width = scrollable ? Math.max(284, shown.length * 52) : svgWidth;
  const height = 192, left = scrollable ? 12 : 27, right = width - 9, top = 12, bottom = 158;
  const cell = (right - left) / shown.length;
  const x = (i: number) => left + cell * (i + .5);
  const y = (value: number) => top + (1 - chartRatio(value, axis)) * (bottom - top);
  const keys = focus ? [focus] : seriesKeys(st);
  const grid = [0, 50, 100, ...(axis.max > 130 ? [axis.max] : [])].filter(v => v >= axis.min && v <= axis.max);
  const selectedIndex = shown.findIndex(r => r.month === selected);

  useEffect(() => {
    const element = scroller.current;
    if (!element || !scrollable) return;
    const update = () => setEdges({ left: element.scrollLeft > 2, right: element.scrollWidth - element.clientWidth - element.scrollLeft > 2 });
    const observer = new ResizeObserver(() => { setViewportWidth(element.clientWidth); update(); }); observer.observe(element); element.addEventListener('scroll', update, { passive: true });
    update(); return () => { observer.disconnect(); element.removeEventListener('scroll', update); };
  }, [scrollable, width]);
  useEffect(() => {
    const element = scroller.current;
    if (!element || !scrollable || selectedIndex < 0) return;
    const scale=(element.querySelector('svg')?.clientWidth??width)/width;
    const point = (left + cell * (selectedIndex + .5))*scale;
    if (selectedIndex === 0) element.scrollLeft = 0;
    else if (selectedIndex === shown.length - 1) element.scrollLeft = element.scrollWidth - element.clientWidth;
    else if (point - cell*scale / 2 < element.scrollLeft) element.scrollLeft = Math.max(0, point - cell*scale / 2 - left*scale);
    else if (point + cell*scale / 2 > element.scrollLeft + element.clientWidth) element.scrollLeft = point + cell*scale / 2 - element.clientWidth;
  }, [selected, selectedIndex, scrollable, width, cell, left, shown.length, viewportWidth]);

  function selectAt(clientX: number, rect: DOMRect) {
    const position = (clientX - rect.left) / rect.width * width;
    onSelect(shown[Math.max(0, Math.min(shown.length - 1, Math.floor((position - left) / cell)))].month);
  }
  return <div className="history-bars-wrap">
    {scrollable && <div className="history-fixed-axis" aria-hidden="true">{grid.map(v => <span key={v} style={{ top: 'calc('+(y(v)-6)+'px * var(--history-factor))' }}>{number(v)}</span>)}</div>}
    <div className={'history-plot history-bar-plot' + (scrollable ? ' can-scroll' : '')} ref={scroller} tabIndex={0} role="group"
      aria-label={`Monatsbalken. ${monthName(selected)} ausgewählt. Pfeiltasten wählen den Monat.`} onKeyDown={e => selectWithKeys(e, rows, selected, onSelect)}>
      <svg viewBox={`0 0 ${width} ${height}`} style={scrollable ? { width: single?'100%':'calc('+width+'px * var(--history-factor))', height: 'calc('+height+'px * var(--history-factor))' } : undefined} aria-hidden="true" onClick={e => selectAt(e.clientX, e.currentTarget.getBoundingClientRect())}>
        {grid.map(value => <g key={value} className={value === 100 ? 'history-reference' : 'history-gridline'}><line x1={scrollable ? 0 : left} x2={right} y1={y(value)} y2={y(value)} />{!scrollable && <text x={left - 6} y={y(value) + 3} textAnchor="end">{number(value)}</text>}</g>)}
        {shown.map((row, i) => <g key={row.month}>
          {row.month === selected && <rect className="history-bar-selection" x={x(i) - cell / 2 + 1} y={top - 6} width={cell - 2} height={bottom - top + 13} rx={5} />}
          {row.sellout === null && row.softbonus === null ? <text className="history-axis-label" x={x(i)} y={y(0) - 6} textAnchor="middle">—</text> : keys.map((key, k) => {
            const value = row[key]; const w = scrollable ? 13 : Math.min(14, cell * .5);
            const bx = x(i) + (keys.length === 2 ? (k === 0 ? -w - 1.5 : 1.5) : -w / 2);
            if (value === null) return <text key={key} className="history-axis-label" x={bx + w / 2} y={y(0) - 4} textAnchor="middle">—</text>;
            return value === 0 ? <circle key={key} cx={bx + w / 2} cy={y(0)} r={3} fill={seriesColor(key)} /> : <rect key={key} x={bx} y={Math.min(y(value), y(0))} width={w} height={Math.abs(y(value) - y(0))} rx={2} fill={seriesColor(key)} opacity={row.month === selected ? 1 : .58} />;
          })}
          {(scrollable || [0, 3, 6, 9, 11].includes(i)) && <text className={row.month === selected ? 'history-axis-selected' : 'history-axis-label'} x={x(i)} y={180} textAnchor="middle">{monthName(row.month,true).replace('.', '')}{(i === 0 || row.month.endsWith('-01')) ? ' ' + row.month.slice(2, 4) : ''}</text>}
        </g>)}
      </svg>
    </div>
    <div className="history-scroll-footer">
      <span>{edges.left&&<button type="button" aria-label="Ältere Monate anzeigen" onClick={()=>scroller.current?.scrollBy({left:-220,behavior:'smooth'})}><ChevronLeft size={15}/></button>}</span>
      <PhoneSelect value={selected} options={rows.map(row=>({value:row.month,label:monthName(row.month)}))} onChange={onSelect} ariaLabel="Monat im Verlauf"/>
      <span>{edges.right&&<button type="button" aria-label="Neuere Monate anzeigen" onClick={()=>scroller.current?.scrollBy({left:220,behavior:'smooth'})}><ChevronRight size={15}/></button>}</span>
    </div>
  </div>;
}

export function PerformanceChart({group,filters,reports=[],onOpenRules,rulesOpen=false,className=''}:{
 group:SECGroup;filters:DashboardFilters;reports?:readonly MonthlyReport[];onOpenRules?:()=>void;rulesOpen?:boolean;className?:string;
}){
 const [view,setView]=useState<'months'|'updates'>('months');
 const [table,setTable]=useState(false);
 const [choice,setChoice]=useState({through:filters.month,month:filters.month});
 const rows=performanceHistory(reports,filters.month,group.id);
 const selected=choice.through===filters.month&&rows.some(r=>r.month===choice.month)?choice.month:filters.month;
 const row=rows.find(r=>r.month===selected)!;
 const st=group.id==='ST';
 const keys:Series[]=st?['softbonus']:filters.series==='both'?['sellout','softbonus']:[filters.series];
 const visibleRows=rows.map(r=>({...r,sellout:keys.includes('sellout')?r.sellout:null,softbonus:keys.includes('softbonus')?r.softbonus:null}));
 const axis=signedChartAxis(visibleRows.flatMap(r=>[r.sellout,r.softbonus]),110);
 const known=visibleRows.some(r=>r.sellout!==null||r.softbonus!==null);
 const complete=visibleRows.filter(r=>keys.every(key=>r[key]!==null)).length;
 const updates=[...reports].filter(r=>r.groupId===group.id&&r.month<=filters.month).sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)).slice(0,12);
 const period=(month:string)=>monthName(month,true).replace('.','')+' '+month.slice(0,4);
 return <section className={'performance-chart performance-history is-revealed '+className} id={group.id+'-section-trend'} data-history-through={filters.month} aria-label={st?'Qualitativer Monatsverlauf':'Sell-out und Softbonus Monatsverlauf'}>
  <header className="performance-chart-header"><div><h2>{st?'Qualitativer Verlauf':'Sell-out & Softbonus'}</h2><p>{view==='months'?period(rows[0].month)+' – '+period(filters.month):'Veröffentlichungen und Korrekturen'}</p></div>
   {!st&&onOpenRules&&<button className="performance-chart-info" type="button" aria-label="Informationen zu Sell-out, Softbonus und Punkten öffnen" aria-haspopup="dialog" aria-expanded={rulesOpen} onClick={onOpenRules}><Info size={28} strokeWidth={1.55}/></button>}
  </header>
  {view==='months'?<>
   {!known?<div className="performance-no-data">{rows.some(r=>r.report)?'Für diese Ansicht liegen noch keine Monatswerte vor.':'Noch kein veröffentlichter Monatsabschluss.'}</div>:<>
    <div className="history-readout" aria-live="polite" aria-atomic="true" aria-label={monthName(selected)}><div>{keys.map(key=><div key={key} className={'history-value history-value-'+key}><span>{names[key]}</span><strong data-history-value={key}>{row[key]===null?<span className="history-unavailable">—</span>:<>{number(row[key])}<small> %</small></>}</strong></div>)}</div></div>
    <BarPlot rows={visibleRows} selected={selected} onSelect={month=>setChoice({through:filters.month,month})} st={st} focus={keys.length===1?keys[0]:undefined} axis={axis} scrollable/>
   </>}
  </>:<div className="performance-update-list" role="region" aria-label="Monatsveröffentlichungen" tabIndex={0}>{updates.map(r=><article key={r.publicationId}><div className="performance-update-date"><strong>{monthName(r.month)}</strong><span>{publicationDate(r.publishedAt)}</span></div><div className="performance-update-detail"><b>{r.revision>1?'Korrektur':'Monatsabschluss'}</b><p>{r.changed.join(' · ')}</p></div></article>)}{!updates.length&&<p>Noch keine Veröffentlichung.</p>}</div>}
  <div className="performance-chart-bottom"><button type="button" className="history-table-toggle" aria-expanded={table} onClick={()=>setTable(!table)}><List/>{table?'Werte schließen':'Alle Werte'}{view==='months'&&known&&complete<12&&<small>{complete}/12</small>}</button><div className="performance-chart-switch" role="group" aria-label="Diagrammansicht"><button type="button" className={view==='months'?'is-active':''} aria-pressed={view==='months'} onClick={()=>setView('months')}>Monate</button><button type="button" className={view==='updates'?'is-active':''} aria-pressed={view==='updates'} onClick={()=>setView('updates')}>Updates</button></div></div>
  <div className={table?'history-values-wrap':'sr-only'}><table className="history-data-table"><caption>Veröffentlichte Monatswerte in Prozent</caption><thead><tr><th>Monat</th>{keys.map(key=><th key={key}>{names[key]}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.month}><th>{period(r.month)}</th>{keys.map(key=><td key={key}>{percent(r[key])}</td>)}</tr>)}</tbody></table></div>
 </section>;
}
