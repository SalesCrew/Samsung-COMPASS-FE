'use client';
import {useEffect,useState} from 'react';
import type {AdminRemote} from './AdminWorkbench';
import {staffingSourceLabel,type ImportStaffingProgress} from '../lib/importStaffing';
import {publicationDate} from '../lib/monthlyClosing';

export function ImportStaffingSources({progress}:{progress:ImportStaffingProgress}){
 return <ul className="import-staffing-sources" aria-label="Stand der Bereichslisten">{progress.sources.map(source=><li key={source.division} data-source-division={source.division} data-source-status={source.division===progress.currentDivision?'current':source.status}><strong>{source.division}</strong><span>{staffingSourceLabel(source,progress.currentDivision)}</span>{source.asOf&&source.division!==progress.currentDivision&&<small>Datenstand {publicationDate(source.asOf)}</small>}</li>)}</ul>;
}

/** Reconstruct the two source sides from durable imports, including after a full reload. */
export function ImportStaffingProgressPanel({remote,group,month,asOf,phase}:{remote:AdminRemote;group:string;month:string;asOf:string;phase:string}){
 const request=remote.request;
 const revision=remote.imports.filter(i=>i.month===month).map(i=>[i.id,i.status,i.saved].join(':')).join('|');
 const key=[group,month,asOf,phase,revision].join('|');
 const [result,setResult]=useState<{key:string;markets:ImportStaffingProgress[];error:string}>({key:'',markets:[],error:''});
 useEffect(()=>{
  if(!asOf.startsWith(month+'-')||phase==='MONTH_FINALIZATION')return;
  const controller=new AbortController();
  const query=new URLSearchParams({group,month,asOf,phase});
  void request<{markets:ImportStaffingProgress[]}>('/admin/import-staffing?'+query,undefined,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setResult({key,markets:data.markets,error:''});}).catch(error=>{if(!controller.signal.aborted)setResult({key,markets:[],error:error instanceof Error?error.message:'Bereichslisten konnten nicht geladen werden.'});});
  return()=>controller.abort();
 },[request,group,month,asOf,phase,key]);
 if(result.key!==key||phase==='MONTH_FINALIZATION'||!result.markets.length&&!result.error)return null;
 if(result.error)return <p className="admin-validation-pending" role="status">{result.error}</p>;
 const pending=result.markets.filter(m=>!m.complete).length;
 return <details className="admin-card import-staffing-progress"><summary>Bereichslisten am Markt <span>{pending?`${pending} noch offen`:'Alle zugeordnet'}</span></summary><p className="admin-muted">Die Listen dürfen nacheinander kommen. Gespeicherte Zuordnungen bleiben erhalten; Entwurf und Veröffentlichung werden getrennt angezeigt.</p>{result.markets.map((market,index)=><div className="import-staffing-market" key={market.market+'-'+index}><strong>{market.market}</strong><ImportStaffingSources progress={market}/></div>)}</details>;
}
