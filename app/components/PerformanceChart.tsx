'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Info } from 'lucide-react';
import type { DashboardFilters } from '../lib/dashboard';
import type { SECGroup } from '../lib/groups';
import { activeReports, monthName, publicationDate, type MonthlyReport } from '../lib/monthlyClosing';
export function PerformanceChart({ group, filters, reports = [], onOpenRules, rulesOpen = false, className = '' }: {
 group: SECGroup; filters: DashboardFilters; reports?: readonly MonthlyReport[]; onOpenRules?: () => void; rulesOpen?: boolean; className?: string;
}) {
 const [view,setView] = useState<'months'|'updates'>('months');
 const [revealed,setRevealed] = useState(false);
 const chartRef = useRef<HTMLElement>(null);
 const isST = group.id === 'ST';
 const displayPercent=(value:number)=>value.toLocaleString('de-AT',{maximumFractionDigits:1});
 const active = activeReports(reports).filter(r => r.month.slice(0,4) === filters.month.slice(0,4) && r.month <= filters.month);
 const ending = Number(filters.month.slice(5));
 const start = Math.max(1,ending-5);
 const rows = Array.from({length:ending-start+1},(_,i) => {const month = filters.month.slice(0,4)+'-'+String(start+i).padStart(2,'0'); return {month, report:active.find(r=>r.month===month)};});
 const maximum = Math.max(110,...active.flatMap(r=>[r.sellout??0,r.softbonus??0]));
 const updates = [...reports].filter(r=>r.month<=filters.month).sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)).slice(0,12);
 useEffect(()=>{
  const chart=chartRef.current;
  if (!chart || revealed) return;
  if(typeof IntersectionObserver === 'undefined') {const frame=requestAnimationFrame(()=>setRevealed(true));return()=>cancelAnimationFrame(frame);}
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setRevealed(true);observer.disconnect();}},{root:chart.closest('.fieldforce-dashboard')?null:chart.closest('.phone-scroll-region'),threshold:.2});
  observer.observe(chart);return()=>observer.disconnect();
 },[revealed]);
 const style=(n:number,delay:number)=>({height:(n/maximum*100)+'%','--bar-delay':delay+'ms'} as CSSProperties);
 return <section ref={chartRef} className={'performance-chart '+(revealed?'is-revealed ':'')+className} id={group.id+'-section-trend'} aria-label={isST?'Qualitativer Monatsverlauf':'Sell-out und Softbonus Monatsverlauf'}>
  <header className="performance-chart-header"><div><h2>{isST?'Qualitativer Verlauf':'Sell-out & Softbonus'}</h2><p>{view==='months'?'Veröffentlichte Monatsabschlüsse · '+filters.month.slice(0,4):'Veröffentlichungen und Korrekturen'}</p></div>
   {!isST&&onOpenRules&&<button className="performance-chart-info" type="button" aria-label="Informationen zu Sell-out, Softbonus und Punkten öffnen" aria-haspopup="dialog" aria-expanded={rulesOpen} onClick={onOpenRules}><Info size={28} strokeWidth={1.55}/></button>}

  </header>
  {view==='months'?<>
   {!active.length?<div className="performance-no-data">Noch kein veröffentlichter Monatsabschluss.</div>:<div className="performance-bar-plot"><div className="performance-guide" style={{bottom:'var(--performance-guide-bottom, '+(100/maximum*100)+'%)','--performance-reference-ratio':100/maximum} as CSSProperties}><span>100%</span></div><div className="performance-bars">{rows.map(({month,report},index)=><div className={'performance-bar-group'+(month===filters.month?' is-current':'')} key={month}>
    <div className="performance-pair">{!report?<span className="history-missing">—</span>:<>
     {!isST&&filters.series!=='softbonus'&&(report.sellout===null?<span className="history-missing">—</span>:<div className="performance-bar is-blue" style={style(report.sellout,80+index*55)} title={monthName(month)+': Sell-out '+report.sellout+'%'}><i className="performance-bar-fill"/><strong>{displayPercent(report.sellout)}</strong></div>)}
     {filters.series!=='sellout'&&(report.softbonus===null?<span className="history-missing">—</span>:<div className="performance-bar is-green" style={style(report.softbonus,115+index*55)} title={monthName(month)+': Softbonus '+report.softbonus+'%'}><i className="performance-bar-fill"/><strong>{displayPercent(report.softbonus)}</strong></div>)}
    </>}</div><span>{monthName(month,true)}</span></div>)}</div></div>}

   <table className="sr-only"><caption>Veröffentlichte Monatswerte</caption><thead><tr><th>Monat</th>{!isST&&<th>Sell-out</th>}<th>Softbonus</th></tr></thead><tbody>{rows.map(({month,report})=><tr key={month}><th>{monthName(month)}</th>{!isST&&<td>{report?.sellout===null||!report?'Nicht verfügbar':report.sellout+'%'}</td>}<td>{report?.softbonus===null||!report?'Nicht verfügbar':report.softbonus+'%'}</td></tr>)}</tbody></table>
  </>:<div className="performance-update-list" role="region" aria-label="Monatsveröffentlichungen" tabIndex={0}>{updates.map(r=><article key={r.publicationId}><div className="performance-update-date"><strong>{monthName(r.month)}</strong><span>{publicationDate(r.publishedAt)}</span></div><div className="performance-update-detail"><b>{r.revision>1?'Korrektur':'Monatsabschluss'}</b><p>{r.changed.join(' · ')}</p></div></article>)}{!updates.length&&<p>Noch keine Veröffentlichung.</p>}</div>}
 <div className="performance-chart-bottom">{view==='months'&&(<footer className="performance-chart-footer">{!isST&&filters.series!=='softbonus'&&<span><i className="is-blue"/>Sell-out</span>}{filters.series!=='sellout'&&<span><i className="is-green"/>Softbonus</span>}<small>Demo · bis {monthName(filters.month)}</small></footer>)}<div className="performance-chart-switch" role="group" aria-label="Diagrammansicht"><button type="button" className={view==='months'?'is-active':''} aria-pressed={view==='months'} onClick={()=>setView('months')}>Monate</button><button type="button" className={view==='updates'?'is-active':''} aria-pressed={view==='updates'} onClick={()=>setView('updates')}>Updates</button></div></div>
 </section>;
}
