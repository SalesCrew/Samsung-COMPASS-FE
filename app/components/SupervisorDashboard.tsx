'use client';

import {useEffect,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {Eye,RefreshCw} from 'lucide-react';
import {SECAPIError,secRequest,reportFromRow,weeklyFromRows,type DashboardData,type SupervisorPerson} from '../lib/secApi';
import {SECWorkbench,type LivePhoneData} from './SECWorkbench';
import {SupervisorSelect} from './SupervisorSelect';
import './supervisor.css';

// Viewing an employee never acknowledges or changes their publications.
const acknowledge=()=>{};

export function SupervisorDashboard({session,onInvalidSession}:{session:Session;onInvalidSession:()=>void}){
 const[people,setPeople]=useState<SupervisorPerson[]|null>(null),[selection,setSelection]=useState('');
 const[data,setData]=useState<DashboardData|null>(null),[directoryError,setDirectoryError]=useState(''),[error,setError]=useState('');
 const[revision,setRevision]=useState(0),[busy,setBusy]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();let running=false;
  async function refresh(){
   if(running||document.visibilityState==='hidden')return;running=true;
   try{
    const result=await secRequest<{people:SupervisorPerson[]}>('/supervisor/people',{signal:controller.signal},session);
    if(controller.signal.aborted)return;
    setPeople(result.people);setSelection(current=>result.people.some(p=>p.assignment_id===current)?current:result.people[0]?.assignment_id??'');setDirectoryError('');
   }catch(e){if(!controller.signal.aborted){if(e instanceof SECAPIError&&(e.status===401||e.code==='ACCOUNT_DISABLED'||e.code==='FORBIDDEN')){setPeople(null);setData(null);onInvalidSession();}else setDirectoryError(e instanceof Error?e.message:'SEC konnten nicht geladen werden.');}}
   finally{running=false;}
  }
  void refresh();const timer=window.setInterval(()=>void refresh(),20000);
  const visible=()=>{if(document.visibilityState==='visible')void refresh();};document.addEventListener('visibilitychange',visible);
  return()=>{controller.abort();window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
 },[session,onInvalidSession,revision]);
 useEffect(()=>{
  if(!selection)return;
  const controller=new AbortController();let running=false;
  async function refresh(){
   if(running||document.visibilityState==='hidden')return;running=true;setBusy(true);
   try{
    const result=await secRequest<DashboardData>('/dashboard?assignment='+encodeURIComponent(selection),{signal:controller.signal},session);
    if(controller.signal.aborted)return;
    setData(result);setError('');
   }catch(e){if(!controller.signal.aborted){if(e instanceof SECAPIError&&(e.status===401||e.code==='ACCOUNT_DISABLED')){setData(null);onInvalidSession();}else{if(e instanceof SECAPIError&&e.status===403)setData(null);setError(e instanceof Error?e.message:'Die SEC-Ansicht konnte nicht geladen werden.');}}}
   finally{running=false;if(!controller.signal.aborted)setBusy(false);}
  }
  void refresh();const timer=window.setInterval(()=>void refresh(),20000);
  const visible=()=>{if(document.visibilityState==='visible')void refresh();};document.addEventListener('visibilitychange',visible);
  return()=>{controller.abort();window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
 },[session,selection,onInvalidSession,revision]);
 const current=people?.find(p=>p.assignment_id===selection);
 // A late response cannot show the previous person's values below a new name.
 const shown=current&&data?.selectedAssignment===selection?data:null;
 const live:LivePhoneData|null=shown&&current?{
  readOnly:true,personName:current.name,market:current.market,groupId:current.department_id,setting:current.setting,
  reports:shown.reports.map(reportFromRow),pointHistory:shown.pointHistory,premiumHistory:shown.premiumHistory,
  targetSnapshots:weeklyFromRows(shown.weekly),calendarDay:shown.calendarDay,readIds:shown.read.map(r=>r.report_id),acknowledge,rankings:shown.rankings,
 }:null;
 return <main className="sec-personal supervisor-dashboard">
  <section className="supervisor-switcher" aria-label="Supervisoransicht">
   <div className="supervisor-switcher-caption"><span>Supervisor</span><div className="supervisor-tools"><span><Eye size={13} aria-hidden="true"/>Nur ansehen</span><button type="button" disabled={busy} onClick={()=>setRevision(n=>n+1)} aria-label="Dashboard aktualisieren"><RefreshCw size={14} aria-hidden="true"/></button></div></div>
   <SupervisorSelect people={people??[]} value={selection} loading={people===null&&!directoryError} onChange={value=>{setSelection(value);setError('');window.scrollTo({top:0,behavior:'instant'});}}/>
  </section>
  {directoryError&&<p className="supervisor-message" role="alert">{directoryError} <button type="button" onClick={()=>setRevision(n=>n+1)}>Erneut versuchen</button></p>}
  {error&&<p className="supervisor-message" role="alert">{error} <button type="button" onClick={()=>setRevision(n=>n+1)}>Erneut versuchen</button></p>}
  {!people&&!directoryError&&<p className="supervisor-message" role="status">SEC werden geladen…</p>}
  {people?.length===0&&<section className="supervisor-empty"><h1>Noch keine SEC verfügbar</h1><p>Freigeschaltete SEC erscheinen hier, sobald ihr Konto zugeordnet ist.</p></section>}
  {selection&&!live&&!error&&<p className="supervisor-message" role="status">SEC-Ansicht wird geladen…</p>}
  {live&&<SECWorkbench key={selection} live={live}/>}
 </main>;
}
