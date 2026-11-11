'use client';
import { ImportFieldFeedback } from './ImportFeedback';
import { importFieldId, type ImportProblem } from '../lib/importFeedback';
import { AdminSelect } from './AdminSelect';

export type ImportIdentityMatch={row:number;sourceName:string;sourceExternalId:string;sourceMarket:string;personId:string|null;status:'matched'|'unresolved'|'new'|'skipped';method:string|null;score:number|null;message:string};
export type ImportPersonOption={id:string;external_id:string;name:string;markets:string[]};
const methods:Record<string,string>={id:'SEC-ID erkannt',name:'Name erkannt',fuzzy:'Ähnlicher Name erkannt',market:'Eindeutige Marktzuordnung',manual:'Manuell zugeordnet',new:'Neue Person bestätigt'};
export function ImportIdentityReview({matches,people,choices,problems=[],onChange}:{matches:ImportIdentityMatch[];people:ImportPersonOption[];choices:Record<string,string>;problems?:ImportProblem[];onChange:(row:number,person:string)=>void}){
 const included=matches.filter(m=>m.status!=='skipped'),skipped=matches.filter(m=>m.status==='skipped');
 const open=included.filter(m=>m.status==='unresolved').length;
 function rows(items:ImportIdentityMatch[]){return items.map(match=>{
   const options=[{value:'skip',label:'Zeile überspringen',description:'Diesen Markt nicht importieren, z. B. wenn er unbesetzt ist.'},...people.map(person=>({value:person.id,label:person.name||person.external_id,description:[person.external_id,...person.markets].join(' · ')}))];
   if(match.status!=='skipped'&&match.sourceName&&match.sourceExternalId&&match.sourceMarket&&!people.some(p=>p.external_id===match.sourceExternalId))options.push({value:'new',label:'Neue Person aus dieser Zeile anlegen',description:match.sourceName});
   const changed=Boolean(choices[String(match.row)]&&choices[String(match.row)]!==(match.status==='skipped'?'skip':match.personId||(match.status==='new'?'new':'')));
   return <div className="admin-identity-row" id={importFieldId(`person-row:${match.row}`)} tabIndex={-1} key={match.row}>
    <div><strong>{match.sourceName||match.sourceMarket||`Zeile ${match.row}`}</strong><small>Zeile {match.row}{match.sourceExternalId?` · SEC-ID ${match.sourceExternalId}`:''}{match.sourceName&&match.sourceMarket?` · ${match.sourceMarket}`:''}</small><span className={match.status==='unresolved'||changed?'admin-validation-pending':match.status==='skipped'?'admin-muted':'admin-validation-ok'}>{changed?'Auswahl geändert. Mit „Daten prüfen“ bestätigen.':match.message||methods[match.method??'']||'Person auswählen'}</span></div>
    <AdminSelect invalid={problems.some(p=>p.target===`person-row:${match.row}`)} describedBy={problems.some(p=>p.target===`person-row:${match.row}`)?importFieldId(`person-row:${match.row}`)+'-help':undefined} ariaLabel={`Person für Zeile ${match.row}`} searchable value={choices[String(match.row)]||match.personId||(match.status==='new'?'new':match.status==='skipped'?'skip':'')} options={options} onChange={person=>onChange(match.row,person)} placeholder="Person auswählen"/>
    <ImportFieldFeedback problems={problems} field={`person-row:${match.row}`} />
   </div>;
  });}
 return <section className="admin-card admin-identity-review" id={importFieldId('people')} tabIndex={-1}>
  <div className="admin-section-head"><div><span className="admin-step">04 · PERSONEN</span><h2>Personen zuordnen</h2></div><span className="admin-muted">{open?`${open} offen`:`${included.length} zugeordnet`}{skipped.length?` · ${skipped.length} übersprungen`:''}</span></div>
  <p className="admin-muted">Prüfe offene Treffer und wähle die richtige Person. Unbesetzte Märkte werden anhand leerer SEC-Felder oder eindeutiger Angaben wie „No SEC“ automatisch ausgelassen. Du kannst eine Zeile auch bewusst überspringen. Bestätige jede Änderung mit „Daten prüfen“.</p>
  {rows(included)}
  {skipped.length>0&&<details className="import-skipped-rows"><summary>{skipped.length} übersprungene {skipped.length===1?'Zeile':'Zeilen'} ansehen</summary><p className="admin-muted">Diese Zeilen werden nicht gespeichert. Ist ein Markt doch besetzt, kannst du hier die richtige Person auswählen und die Daten erneut prüfen.</p>{rows(skipped)}</details>}
 </section>;
}
