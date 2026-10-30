'use client';
import { useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { DA_SETTINGS, groupKpiOptions, type SECGroup } from '../lib/groups';
import { usePhoneDialog } from './usePhoneDialog';
import { PhoneSelect } from './PhoneSelect';
import { countFilters, type DashboardFilters as FilterValues } from '../lib/dashboard';
import { activeReports, latestReport, monthName, publicationDate, type MonthlyReport } from '../lib/monthlyClosing';
export function DashboardFilters({ value, group, reports, defaults, onApply, onClose, realData=false }: {
 value:FilterValues; group:SECGroup; reports:readonly MonthlyReport[]; defaults:FilterValues; onApply:(value:FilterValues)=>void; onClose:()=>void; realData?:boolean;
}) {
 const [draft,setDraft]=useState(value);
 const panelRef=usePhoneDialog(onClose);
 const published=activeReports(reports);
 const selected=published.find(r=>r.month===draft.month);
 const count=countFilters(draft,defaults);
 const months=[...published].reverse().map(r=>({value:r.month,label:monthName(r.month)}));
 const kpiOptions=realData?[{value:'all',label:group.id==='ST'?'Alle Kriterien':'Alle KPIs'},{value:'below',label:'Unter 100 %'},...(selected?.metrics??[]).filter(m=>m.resultState!=='not-applicable').map(m=>({value:m.key,label:m.label}))]:groupKpiOptions(group.id,draft.daSetting);
 return <div className="dashboard-filter-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="dashboard-filter-panel" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={group.id+'-filter-title'} aria-describedby={group.id+'-filter-description'}>
  <header className="dashboard-filter-header"><div><p>DEIN DASHBOARD</p><h2 id={group.id+'-filter-title'}>Monatsansicht</h2></div><button className="filter-close" onClick={onClose} aria-label="Filter schließen, Änderungen verwerfen"><X size={32}/></button></header>
  <div className="dashboard-filter-body"><p className="filter-intro" id={group.id+'-filter-description'}>Wähle einen veröffentlichten Monatsabschluss.</p><div className="filter-personal-context"><strong>{group.id} · {group.description}</strong><span>Mein zugeordneter Markt · persönliche Ansicht</span>{group.id==='DA'&&<span>Zuordnung: {DA_SETTINGS.find(s=>s.value===draft.daSetting)?.label}</span>}</div>
   <fieldset className="filter-group"><legend>Berichtsmonat</legend>{months.length?<div className="filter-select-label"><span>Monat und Jahr</span><PhoneSelect ariaLabel="Berichtsmonat" value={draft.month} onChange={month=>setDraft(d=>({...d,month}))} options={months}/></div>:<p className="filter-help">Noch kein Monatsabschluss verfügbar.</p>}{selected&&<p className="filter-help">Veröffentlicht am {publicationDate(selected.publishedAt)}{selected.revision>1?' · korrigierter Abschluss':''}</p>}</fieldset>
   <fieldset className="filter-group"><legend>Vergleich & Details</legend><div className="filter-select-label"><span>Veränderung vergleichen mit</span><PhoneSelect ariaLabel="Veränderung vergleichen mit" value={draft.comparison} onChange={comparison=>setDraft(d=>({...d,comparison:comparison as FilterValues['comparison']}))} options={[{value:'month',label:'Vormonatsabschluss'},{value:'none',label:'Ohne Vergleich'}]}/></div><div className="filter-select-label"><span>{group.id==='ST'?'Bewertungskriterium':'KPI-Fokus'}</span><PhoneSelect ariaLabel={group.id==='ST'?'Bewertungskriterium':'KPI-Fokus'} value={draft.kpi} onChange={kpi=>setDraft(d=>({...d,kpi}))} options={kpiOptions}/></div><p className="filter-help">Der Fokus begrenzt die Details. Die veröffentlichten Gesamtwerte bleiben unverändert.</p></fieldset>
   {group.id!=='ST'&&<fieldset className="filter-group"><legend>Verlauf</legend><div className="filter-series-grid">{([['both','Beide'],['sellout','Sell-out'],['softbonus','Softbonus']] as const).map(([series,label])=><label className="filter-chip" key={series}><input type="radio" name={group.id+'-dashboard-series'} checked={draft.series===series} onChange={()=>setDraft(d=>({...d,series}))}/><span>{label}</span></label>)}</div></fieldset>}
   <p className="filter-scope-note">{group.id==='ST'?'Qualitative Monatsbewertungen; das Jahres- und Prämienmodell ist offen.':'Punkte, SEC-Level und Prämien nutzen die letzten 12 Monate bis zum gewählten Abschluss.'}</p><p className="filter-demo-note">{realData?'Die Ziele zeigen immer den laufenden Monat. Die KPI-Zeitbar folgt dem Kalender.':'Synthetische Vorschau. Die Ziele zeigen immer den laufenden Monat. Die KPI-Zeitbar folgt dem Kalender.'}</p>
  </div><footer className="dashboard-filter-footer"><p aria-live="polite">{published.length} Monatsabschlüsse · {count?count+' Filter geändert':'Standardansicht'}</p><div><button className="filter-reset" onClick={()=>setDraft({...defaults,month:latestReport(reports)?.month??defaults.month})}><RotateCcw size={26}/>Zurücksetzen</button><button className="filter-apply" onClick={()=>onApply(draft)}>Anwenden<Check size={27}/></button></div></footer>
 </div></div>;
}
