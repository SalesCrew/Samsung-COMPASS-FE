'use client';
import { useState } from 'react';
import { AdminMonthPicker } from './AdminTemporalPicker';
import type { AdminRemote } from './AdminWorkbench';

type Summary={count:number;linked:number;sourceMonth?:string|null;headers?:string[];unchanged?:boolean};
/** The source list is uploaded without opening a sheet or returning employee values. */
export function RosterReference({remote}:{remote:AdminRemote}){
 const [month,setMonth]=useState(()=>new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',timeZone:'Europe/Vienna'}).format(new Date()).slice(0,7));
 const [file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[summary,setSummary]=useState<Summary|null>(null),[error,setError]=useState('');
 async function save(){
  if(!file)return;setBusy(true);setError('');setSummary(null);
  try{
   const result=await remote.request<Summary>('/admin/roster?month='+encodeURIComponent(month),undefined,{method:'POST',headers:{'X-File-Name':encodeURIComponent(file.name)},body:file});
   setSummary(result);
  }catch(e){setError(e instanceof Error?e.message:'Referenzliste konnte nicht gespeichert werden.');}
  finally{setBusy(false);}
 }
 return <details className="admin-card roster-reference"><summary>Personenliste für automatische SEC-Zuordnung</summary>
  <p className="admin-muted">Marktbezeichnungen aus Weekly- und Monatsdateien werden mit dieser Referenzliste abgeglichen. Die Liste wird ohne Personen-Vorschau verarbeitet.</p>
  <div className="admin-form-grid">
   <label>Stand der Personenliste<AdminMonthPicker value={month} onChange={setMonth} ariaLabel="Stand der Personenliste"/></label>
   <label>Anstellungsinfos<input type="file" accept=".xlsx,.xlsm" disabled={busy} onChange={event=>{setFile(event.target.files?.[0]??null);setError('');setSummary(null);}} aria-describedby="roster-reference-help"/></label>
  </div>
  <p className="admin-muted" id="roster-reference-help">Benötigt: Nachname, Vorname, Division, Email und Markt. „Zuständiger SV“ wird ausgelassen. Eine aktuelle Liste wird nicht auf frühere Berichtsmonate übertragen.</p>
  <button type="button" className="admin-primary" disabled={!file||busy} onClick={()=>void save()}>{busy?'Liste wird geprüft…':'Referenzliste speichern'}</button>
  {error&&<p className="admin-validation-pending" role="alert">{error}</p>}
  {summary&&<p className="admin-validation-ok" role="status">{summary.count} Einträge {summary.unchanged?'bereits vorhanden':'gespeichert'} · {summary.linked} mit einem SEC-Konto verknüpft. {summary.count-summary.linked>0?(summary.count-summary.linked)+' ohne eindeutige Kontoverknüpfung; diese werden nicht automatisch zugeordnet.':''}</p>}
 </details>;
}
