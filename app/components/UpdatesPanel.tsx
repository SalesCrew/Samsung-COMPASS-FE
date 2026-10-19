'use client';
import { useEffect, useMemo, useRef } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { monthName, publicationDate, type MonthlyReport } from '../lib/monthlyClosing';
import type { SECGroup } from '../lib/groups';
import { usePhoneDialog } from './usePhoneDialog';
export function UpdatesPanel({ group, reports, unread, onClose, onDone, onView }: {
 group:SECGroup; reports:readonly MonthlyReport[]; unread:ReadonlySet<string>; onClose:()=>void; onDone:(reports:readonly MonthlyReport[])=>void; onView:(report:MonthlyReport)=>void;
}) {
 const panelRef=usePhoneDialog(onClose);
 const updates=useMemo(()=>[...reports].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)).slice(0,12),[reports]);
 const seen=useRef(new Set<string>());
 useEffect(()=>{
  const body=panelRef.current?.querySelector('.updates-body');
  if(!body)return;
  const observer=new IntersectionObserver(entries=>{
   if(document.visibilityState!=='visible')return;
   for(const entry of entries)if(entry.isIntersecting&&entry.intersectionRatio>=.6){const id=(entry.target as HTMLElement).dataset.publicationId;if(id)seen.current.add(id);}
  },{root:body,threshold:.6});
  body.querySelectorAll('.update-event').forEach(entry=>observer.observe(entry));
  return()=>observer.disconnect();
 },[updates,panelRef]);
 return <div className="dashboard-filter-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="dashboard-filter-panel updates-panel" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={group.id+'-updates-title'}>
 <header className="dashboard-filter-header"><div><p>{reports.some(r=>r.reportId.startsWith('demo-'))?'MONATSBERICHTE · DEMO':'MONATSBERICHTE'}</p><h2 id={group.id+'-updates-title'}>Was ist neu?</h2></div><button className="filter-close" onClick={onClose} aria-label="Updates schließen"><X size={32}/></button></header>
 <div className="dashboard-filter-body updates-body"><p className="filter-intro">Neue Monatsabschlüsse und Korrekturen deiner Ergebnisse.</p>{updates.map(report=>{
  const before=reports.find(r=>r.reportId===report.reportId&&r.revision===report.revision-1);
  const delta=before?.premium!==null&&before?.premium!==undefined&&report.premium!==null?report.premium-before.premium:null;
  return <article className="update-event" key={report.publicationId} data-publication-id={report.publicationId}><div className="update-event-head"><span className="update-event-icon">{unread.has(report.publicationId)?<Bell size={25}/>:<Check size={25}/>}</span><div><strong>{monthName(report.month)}</strong><small>{publicationDate(report.publishedAt)} · {report.revision>1?'Korrektur':'Monatsabschluss'}</small></div>{unread.has(report.publicationId)&&<em>NEU</em>}</div><div className="update-event-fields"><p><b>{report.revision>1?'Aktualisiert':'Veröffentlicht'}</b>{report.changed.join(' · ')}</p>{delta!==null&&<p><b>Änderung der Hauptprämie</b>{delta>0?'+':''}{delta.toLocaleString('de-AT')} € zum vorherigen Abschluss desselben Monats</p>}</div><button className="publication-view" onClick={()=>onView(report)}>Monatsbericht ansehen</button></article>;
 })}{!updates.length&&<p className="filter-intro">Noch keine Veröffentlichung vorhanden.</p>}<p className="filter-demo-note">{reports.some(r=>r.reportId.startsWith('demo-'))?'Synthetische Veröffentlichungshistorie. ':''}Fehlende Werte werden nicht aus einem anderen Monat übernommen.</p></div>
 <footer className="dashboard-filter-footer"><button className="updates-done" onClick={()=>{if(document.visibilityState==='visible')onDone(updates.filter(r=>seen.current.has(r.publicationId)));else onClose();}}>Fertig</button></footer>
 </div></div>;
}
