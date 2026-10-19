'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { secAuth, secPost, secRequest, SECAPIError, reportFromRow, weeklyFromRows, type SECAccount, type DashboardData } from '../lib/secApi';
import { SECWorkbench, type LivePhoneData } from './SECWorkbench';
import { PhoneSelect } from './PhoneSelect';
import type { MonthlyReport } from '../lib/monthlyClosing';
import { RealAdminWorkbench } from './RealAdminWorkbench';
import { AdminPasswordDialog } from './AdminPasswordDialog';
import { PersonalPrivacy } from './SECPrivacyPanels';
import { SECMFA } from './SECMFA';
import './secApplication.css';

export function SECApplication({view='dashboard'}:{view?:'dashboard'|'admin'}){
 const [session,setSession]=useState<Session|null>(null);
 const [profile,setProfile]=useState<SECAccount|null>(null);
 const [accountView,setAccountView]=useState<'none'|'privacy'|'password'|'mfa'>('none');
 const [adminPasswordOpen,setAdminPasswordOpen]=useState(false);
 const [authNotice,setAuthNotice]=useState('');
 const[mfaRequired,setMfaRequired]=useState(false);
 const[noticeVersion,setNoticeVersion]=useState('sec-2026-10-14');
 const [ready,setReady]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{
  let cancelled=false;
  const client=secAuth();
  client.auth.getSession().then(({data})=>{if(!cancelled){setSession(data.session);setReady(true);}});
  const {data}=client.auth.onAuthStateChange((_event,next)=>{setSession(next);if(!next)setProfile(null);});
  return()=>{cancelled=true;data.subscription.unsubscribe();};
 },[]);
 useEffect(()=>{
  if(!session)return;
  const controller=new AbortController();
  let running=false;
  async function refresh(){if(running||document.visibilityState==='hidden')return;running=true;try{const data=await secRequest<{profile:SECAccount;mfaRequired:boolean;noticeVersion:string}>('/me',{signal:controller.signal},session);setProfile(data.profile);setMfaRequired(data.mfaRequired);setNoticeVersion(data.noticeVersion);setError('');}catch(e){if((e as Error).name!=='AbortError'){if(e instanceof SECAPIError&&(e.status===401||e.status===403))setProfile(null);setError(e instanceof Error?e.message:'Zugang konnte nicht geprüft werden.');}}finally{running=false;}}
  void refresh();const timer=window.setInterval(()=>void refresh(),20000);
  return()=>{controller.abort();window.clearInterval(timer);};
 },[session]);
 const logout=useCallback(async()=>{
  try{if(session)await secPost('/auth/logout',{},session);}catch{/* Clear the local session even when it was already revoked. */}finally{await secAuth().auth.signOut({scope:'local'});setProfile(null);setSession(null);setAccountView('none');setAdminPasswordOpen(false);}
 },[session]);
 const request=useCallback(<T,>(path:string,body?:unknown,options?:RequestInit)=>options?secRequest<T>(path,options,session):body===undefined?secRequest<T>(path,{},session):secPost<T>(path,body,session),[session]);
 async function acknowledgeNotice(){try{await request('/notice',{version:noticeVersion});setProfile(current=>current?{...current,notice_version:noticeVersion}:null);}catch(e){setError(e instanceof Error?e.message:'Bestätigung fehlgeschlagen.');}}
 async function adminPasswordSaved(){await logout();setError('');setAuthNotice('Passwort geändert. Melde dich mit deinem neuen Passwort an.');}
 if(!ready)return <div className="sec-access-shell"><p role="status">Verbindung wird hergestellt…</p></div>;
 if(!session)return <AccessForm onSignedIn={next=>{setAuthNotice('');setSession(next);}} notice={error} successNotice={authNotice}/>;
 if(!profile)return <div className="sec-access-shell"><div className="sec-access-card"><h1>Samsung SEC</h1><p role="status">{error||'Dein Zugang wird geprüft…'}</p>{error&&<button onClick={()=>void logout()}>Zur Anmeldung</button>}</div></div>;
 if(mfaRequired)return <SECMFA required onDone={()=>setMfaRequired(false)} onCancel={()=>void logout()}/>;
 if(profile.must_change_password)return <PasswordForm session={session} profile={profile} onDone={logout}/>;
 return <div className="sec-application">
  <header className="sec-account-bar"><Link href="/">Samsung <strong>SEC</strong></Link><span>{profile.display_name||profile.email}</span><a href="/datenschutz">Datenschutz</a><button onClick={()=>setAccountView(v=>v==='none'?'privacy':'none')}>Mein Konto</button><button onClick={()=>void logout()}><LogOut size={16}/>Abmelden</button></header>
  {profile.notice_version!==noticeVersion&&<div className="sec-notice-banner"><span>Aktualisierte <a href="/datenschutz">Datenschutzinformation</a> · {noticeVersion}</span><button onClick={()=>void acknowledgeNotice()}>Als gelesen bestätigen</button></div>}
  {error&&<p className="sec-refresh-error" role="status">{error}</p>}
  {accountView!=='none'&&<nav className="sec-account-menu" aria-label="Mein Konto"><button onClick={()=>setAccountView('none')}>Zum Dashboard</button><button onClick={()=>setAccountView('privacy')}>Meine Daten</button><button onClick={()=>setAccountView('password')}>Passwort ändern</button><button onClick={()=>setAccountView('mfa')}>Authenticator</button></nav>}
  {accountView==='privacy'?<PersonalPrivacy request={request}/>:accountView==='password'?<PasswordForm session={session} profile={profile} onDone={logout}/>:accountView==='mfa'?<SECMFA onDone={()=>setAccountView('none')} onCancel={()=>setAccountView('none')}/>:profile.role!=='sec'?<RealAdminWorkbench key={[profile.user_id,profile.role,profile.department_ids.join(','),profile.primary_department,profile.setting,profile.person_id].join('|')} session={session} profile={profile} onPasswordChange={()=>setAdminPasswordOpen(true)}/>:view==='admin'?<div className="sec-access-shell"><p>Für die Verwaltung fehlen dir die Rechte.</p><Link href="/">Zum Dashboard</Link></div>:<PersonalDashboard key={[profile.user_id,profile.role,profile.department_ids.join(','),profile.primary_department,profile.setting,profile.person_id].join('|')} session={session} profile={profile} onInvalidSession={logout}/>}
  {profile.role!=='sec'&&adminPasswordOpen&&<AdminPasswordDialog session={session} onClose={()=>setAdminPasswordOpen(false)} onSaved={adminPasswordSaved}/>}
 </div>;
}
function AccessForm({onSignedIn,notice,successNotice}:{onSignedIn:(session:Session)=>void;notice:string;successNotice:string}){
 const[email,setEmail]=useState('');const[password,setPassword]=useState('');const[error,setError]=useState(notice);const[busy,setBusy]=useState(false);
 async function submit(event:React.FormEvent){event.preventDefault();setBusy(true);setError('');try{const data=await secPost<{session:Session}>('/auth/login',{email,password});const result=await secAuth().auth.setSession({access_token:data.session.access_token,refresh_token:data.session.refresh_token});if(result.error)throw result.error;setPassword('');onSignedIn(data.session);}catch(e){setError(e instanceof Error?e.message:'Anmeldung fehlgeschlagen.');}finally{setBusy(false);}}
 return <main className="sec-access-shell"><form className="sec-access-card" onSubmit={submit}><span className="sec-access-brand">SAMSUNG · SEC</span><h1>Dein Dashboard</h1><p>Mit deinem freigeschalteten SEC-Zugang anmelden.</p>{successNotice&&<p className="sec-access-success" role="status">{successNotice}</p>}<label>E-Mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="username"/></label><label>Passwort<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/></label>{error&&<p className="sec-access-error" role="alert">{error}</p>}<button className="sec-access-primary" disabled={busy}>{busy?'Anmelden…':'Anmelden'}</button><small>Noch kein Zugang? Wende dich an deine zuständige Administration.</small><a href="/datenschutz">Datenschutzinformation</a></form></main>;
}
function PasswordForm({session,profile,onDone}:{session:Session;profile:SECAccount;onDone:()=>Promise<void>}){
 const[currentPassword,setCurrent]=useState('');const[next,setNext]=useState('');const[confirm,setConfirm]=useState('');const[error,setError]=useState('');const[busy,setBusy]=useState(false);
 async function submit(event:React.FormEvent){event.preventDefault();if(next!==confirm){setError('Die neuen Passwörter stimmen nicht überein.');return;}setBusy(true);setError('');try{await secPost('/auth/password',{currentPassword,newPassword:next},session);await onDone();}catch(e){setError(e instanceof Error?e.message:'Passwort konnte nicht geändert werden.');}finally{setBusy(false);}}
 return <main className="sec-access-shell"><form className="sec-access-card" onSubmit={submit}><ShieldCheck size={24}/><h1>{profile.must_change_password?'Eigenes Passwort festlegen':'Passwort ändern'}</h1><p>{profile.display_name||profile.email} · {profile.must_change_password?'Ersetze das Startpasswort.':'Lege ein neues Passwort fest.'} Danach meldest du dich erneut an.</p><label>Aktuelles Passwort<input type="password" value={currentPassword} onChange={e=>setCurrent(e.target.value)} required autoComplete="current-password"/></label><label>Neues Passwort<input type="password" value={next} onChange={e=>setNext(e.target.value)} required minLength={12} maxLength={128} autoComplete="new-password"/></label><label>Neues Passwort wiederholen<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required minLength={12} maxLength={128} autoComplete="new-password"/></label>{error&&<p className="sec-access-error" role="alert">{error}</p>}<button className="sec-access-primary" disabled={busy}>{busy?'Speichern…':'Passwort speichern'}</button></form></main>;
}
function PersonalDashboard({session,profile,onInvalidSession}:{session:Session;profile:SECAccount;onInvalidSession:()=>void}){
 const[data,setData]=useState<DashboardData|null>(null);const[assignment,setAssignment]=useState('');const[error,setError]=useState('');const[busy,setBusy]=useState(false);
 const[testMonth,setTestMonth]=useState(()=>profile.is_test?new URLSearchParams(window.location.search).get('testMonth')??'':'');
 const[testDay,setTestDay]=useState(()=>profile.is_test?new URLSearchParams(window.location.search).get('testDay')??'':'');
 const load=useCallback(async(signal?:AbortSignal)=>{
  const params=new URLSearchParams();if(assignment)params.set('assignment',assignment);if(profile.is_test&&testMonth)params.set('testMonth',testMonth);
  if(profile.is_test&&testDay)params.set('testDay',testDay);
  const result=await secRequest<DashboardData>('/dashboard'+(params.size?'?'+params.toString():''),{signal},session);setData(result);setError('');
 },[session,assignment,profile.is_test,testMonth,testDay]);
 useEffect(()=>{
  const controller=new AbortController();let running=false;
  async function refresh(){if(running||document.visibilityState==='hidden')return;running=true;try{await load(controller.signal);}catch(e){if((e as Error).name!=='AbortError'){if(e instanceof SECAPIError&&(e.status===401||e.code==='ACCOUNT_DISABLED')){setData(null);onInvalidSession();}else setError(e instanceof Error?e.message:'Aktualisierung fehlgeschlagen.');}}finally{running=false;}}
  void refresh();const timer=window.setInterval(()=>void refresh(),20000);const visibility=()=>{if(document.visibilityState==='visible')void refresh();};document.addEventListener('visibilitychange',visibility);
  return()=>{controller.abort();window.clearInterval(timer);document.removeEventListener('visibilitychange',visibility);};
 },[load,onInvalidSession]);
 const acknowledge=useCallback((reports:readonly MonthlyReport[])=>{
  void Promise.all(reports.map(r=>secPost('/read',{reportId:r.publicationId},session))).then(()=>load()).catch(e=>setError(e.message));
 },[session,load]);
 async function refreshNow(){setBusy(true);try{await load();}catch(e){setError(e instanceof Error?e.message:'Aktualisierung fehlgeschlagen.');}finally{setBusy(false);}}
 if(!data)return <div className="sec-access-shell"><p role="status">{error||'Dein Monatsstand wird geladen…'}</p></div>;
 if(!profile.person_id)return <div className="sec-access-shell"><div className="sec-access-card"><h1>Dein Zugang ist bereit</h1><p>Die Administration muss deinen Zugang noch mit deiner SEC-ID und Marktzuordnung verknüpfen.</p></div></div>;
 const groupId=data.assignments.find(a=>a.id===data.selectedAssignment)?.department_id??profile.primary_department;
 if(!groupId)return <div className="sec-access-shell"><p>Noch keine Marktzuordnung vorhanden.</p></div>;
 const live:LivePhoneData={groupId,setting:data.assignments.find(a=>a.id===data.selectedAssignment)?.setting??(groupId==='DA'?data.profile.setting:'full'),reports:data.reports.map(reportFromRow),targetSnapshots:weeklyFromRows(data.weekly,profile.is_test&&data.testReplay===true),calendarDay:data.calendarDay,readIds:data.read.map(r=>r.report_id),acknowledge,rankings:data.rankings};
 const testDays=[...new Set([data.realCalendarDay??data.calendarDay,data.calendarDay,...data.reports.map(r=>{const month=r.month.slice(0,7);return month+'-'+String(new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).getUTCDate()).padStart(2,'0');}),...data.weekly.map(r=>(r as typeof r&{as_of:string}).as_of)])].sort().reverse();
 return <main className="sec-personal"><div className="sec-personal-context"><div>{data.assignments.length>1?<PhoneSelect ariaLabel="Mein Markt" value={data.selectedAssignment??''} options={data.assignments.map(a=>({value:a.id,label:a.market}))} onChange={setAssignment}/>:<span>{data.assignments[0]?.market??'Mein Markt'}</span>}{profile.is_test&&<small>Testkonto</small>}</div><button onClick={()=>void refreshNow()} disabled={busy} aria-label="Dashboard aktualisieren"><RefreshCw size={16}/></button></div>{profile.is_test&&<div className="sec-test-period"><label>Prüfstand<PhoneSelect ariaLabel="Prüfstand" value={testDay||data.calendarDay} options={testDays.map(day=>({value:day,label:new Intl.DateTimeFormat('de-AT',{day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'))}))} onChange={day=>{setTestMonth(day.slice(0,7));setTestDay(day);}}/></label>{data.testReplay&&<small>Historischer Test mit Originaldaten. Upload-Datum und Datenstand bleiben getrennt sichtbar.</small>}</div>}{error&&<p className="sec-refresh-error" role="status">{error} <button onClick={()=>void refreshNow()}>Erneut versuchen</button></p>}<SECWorkbench live={live}/></main>;
}

