'use client';
import { AdminSelect } from './AdminSelect';

export type ImportIdentityMatch={row:number;sourceName:string;sourceExternalId:string;sourceMarket:string;personId:string|null;status:'matched'|'unresolved'|'new';method:string|null;score:number|null;message:string};
export type ImportPersonOption={id:string;external_id:string;name:string;markets:string[]};
const methods:Record<string,string>={id:'SEC-ID erkannt',name:'Name erkannt',fuzzy:'Ähnlicher Name erkannt',market:'Eindeutige Marktzuordnung',manual:'Manuell zugeordnet',new:'Neue Person bestätigt'};
export function ImportIdentityReview({matches,people,choices,onChange}:{matches:ImportIdentityMatch[];people:ImportPersonOption[];choices:Record<string,string>;onChange:(row:number,person:string)=>void}){
 const open=matches.filter(m=>m.status==='unresolved').length;
 return <section className="admin-card admin-identity-review">
  <div className="admin-section-head"><div><span className="admin-step">04 · PERSONEN</span><h2>Personen zuordnen</h2></div><span className="admin-muted">{open?`${open} offen`:`${matches.length} zugeordnet`}</span></div>
  <p className="admin-muted">Namen werden unabhängig von Reihenfolge, Bindestrichen und Schreibweise abgeglichen. Offene oder mehrdeutige Treffer bitte auswählen und mit „Daten prüfen“ bestätigen.</p>
  {matches.map(match=>{
   const options=people.map(person=>({value:person.id,label:person.name||person.external_id,description:[person.external_id,...person.markets].join(' · ')}));
   if(match.sourceName&&match.sourceExternalId&&match.sourceMarket&&!people.some(p=>p.external_id===match.sourceExternalId))options.push({value:'new',label:'Neue Person aus dieser Zeile anlegen',description:match.sourceName});
   return <div className="admin-identity-row" key={match.row}>
    <div><strong>{match.sourceName||match.sourceMarket||`Zeile ${match.row}`}</strong><small>Zeile {match.row}{match.sourceExternalId?` · SEC-ID ${match.sourceExternalId}`:''}{match.sourceName&&match.sourceMarket?` · ${match.sourceMarket}`:''}</small><span className={match.status==='unresolved'?'admin-validation-pending':'admin-validation-ok'}>{match.message||methods[match.method??'']||'Person auswählen'}</span></div>
    <AdminSelect ariaLabel={`Person für Zeile ${match.row}`} searchable value={choices[String(match.row)]||match.personId||(match.status==='new'?'new':'')} options={options} onChange={person=>onChange(match.row,person)} placeholder="Person auswählen"/>
   </div>;
  })}
 </section>;
}
