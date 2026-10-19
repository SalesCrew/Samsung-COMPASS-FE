'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { RefreshCw } from 'lucide-react';
import { AdminWorkbench, type AdminRemote } from './AdminWorkbench';
import { AdminAccounts } from './SECAccountPanels';
import { AdminPrivacy } from './SECPrivacyPanels';
import { secRequest, secPost, SECAPIError, type SECAccount, type AdminData } from '../lib/secApi';
import { liveDashboardSource, configVersions, importVersions } from '../lib/adminLiveData';
import { SEC_GROUPS } from '../lib/groups';

export function RealAdminWorkbench({session,profile,onPasswordChange}:{session:Session;profile:SECAccount;onPasswordChange:()=>void}){
 const [data,setData]=useState<AdminData|null>(null);const[accounts,setAccounts]=useState<SECAccount[]>([]);const[error,setError]=useState('');
 const request=useCallback(<T,>(path:string,body?:unknown,options?:RequestInit)=>options?secRequest<T>(path,options,session):body===undefined?secRequest<T>(path,{},session):secPost<T>(path,body,session),[session]);
 const refresh=useCallback(async()=>{
  const [result,access]=await Promise.all([request<AdminData>('/admin/data'),request<{accounts:SECAccount[]}>('/admin/accounts')]);
  setData(result);setAccounts(access.accounts);setError('');
 },[request]);
 useEffect(()=>{let mounted=true;let running=false;async function poll(){if(running||document.visibilityState==='hidden')return;running=true;try{await refresh();}catch(e){if(mounted){if(e instanceof SECAPIError&&(e.status===401||e.status===403))setData(null);setError(e instanceof Error?e.message:'Daten konnten nicht geladen werden.');}}finally{running=false;}}void poll();const timer=window.setInterval(()=>void poll(),20000);const visible=()=>{if(document.visibilityState==='visible')void poll();};document.addEventListener('visibilitychange',visible);return()=>{mounted=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);};},[refresh]);
 const source=useMemo(()=>data?liveDashboardSource(data):null,[data]);
 if(!data||!source)return <main className="sec-access-shell"><div className="sec-access-card"><h1>Verwaltung</h1><p role="status">{error||'Veröffentlichte Daten werden geladen…'}</p>{error&&<button onClick={()=>void refresh().catch(e=>setError(e.message))}>Erneut versuchen</button>}</div></main>;
 const departments=profile.role==='app_admin'?SEC_GROUPS.map(g=>g.id):profile.department_ids;
 const remote:AdminRemote={source,configs:configVersions(data),imports:importVersions(data),departments,request,refresh,accounts:<AdminAccounts request={request} refresh={refresh} accounts={accounts} data={data} profile={profile}/>,privacy:<AdminPrivacy request={request} profile={profile} data={data}/>};
 return <>{error&&<div className="sec-refresh-error" role="status">{error}<button onClick={()=>void refresh().catch(e=>setError(e.message))}><RefreshCw size={16}/>Erneut versuchen</button></div>}<AdminWorkbench remote={remote} onPasswordChange={onPasswordChange}/></>;
}
