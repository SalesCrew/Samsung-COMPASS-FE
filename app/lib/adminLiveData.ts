import type { AdminData, PublishedRow } from './secApi';
import type { DashboardScope, DashboardResult, DashboardFocus } from './adminDashboard';
import { reportFromRow } from './secApi';
import type { ConfigVersion, ImportVersion } from './admin';
import { monthName } from './monthlyClosing';

export type LiveDashboardSource={
 initialMonth?:string;
 people: {id:string;group:import('./groups').SECGroup['id'];market:string;shift:number}[];
 months:{value:string;label:string}[];
 snapshots:(month:string)=>{value:string;label:string}[];
 results:(scope:DashboardScope)=>DashboardResult[];
};
function active(rows:PublishedRow[],weekly:boolean){
 const found=new Map<string,PublishedRow>();
 for(const row of rows){const key=row.assignment_id+'|'+row.month+'|'+(weekly?(row as PublishedRow & {as_of:string}).as_of:'');const old=found.get(key);if(!old||row.revision>old.revision)found.set(key,row);}
 return[...found.values()];
}
export function liveDashboardSource(data:AdminData):LiveDashboardSource{
 const people=new Map(data.people.map(p=>[p.id,p]));
 const assignment=new Map(data.assignments.map(a=>[a.id,a]));
 const months=[...new Set([...data.reports,...data.weekly].map(r=>r.month.slice(0,7)))].sort().reverse().map(value=>({value,label:monthName(value)}));
 return{
  initialMonth:[...data.reports].sort((a,b)=>b.month.localeCompare(a.month))[0]?.month.slice(0,7)??months[0]?.value,
  people:data.assignments.map(a=>({id:people.get(a.person_id)?.external_id??a.person_id,group:a.department_id,market:a.market,shift:0})),
  months,
  snapshots:month=>[{value:'latest',label:'Veröffentlichter Monatsabschluss'},...[...new Set(data.weekly.filter(r=>r.month.startsWith(month)).map(r=>(r as PublishedRow & {as_of:string}).as_of))].sort().reverse().map(date=>({value:'weekly:'+date,label:'Wochenstand · '+date.slice(8)+'.'+date.slice(5,7)+'.'}))],
  results:scope=>{
   const weekly=scope.snapshot.startsWith('weekly:');
   const date=scope.snapshot.slice(7);
   return active(weekly?data.weekly.filter(r=>(r as PublishedRow & {as_of:string}).as_of===date):data.reports,weekly)
    .filter(r=>r.month.startsWith(scope.month)&&(scope.group==='all'||r.department_id===scope.group))
    .flatMap(r=>{
     const person=people.get(r.person_id),a=assignment.get(r.assignment_id);if(!person||!a||(scope.market!=='all'&&scope.market!==a.market))return[];
     const value=weekly?(r.payload as typeof r.payload & {sellout?:number|null}).sellout??null:r.payload.sellout;
     const softbonus=weekly?null:r.payload.softbonus;
     const premium=weekly?null:r.payload.premium;
     const focus:Exclude<DashboardFocus,'all'>=r.department_id==='ST'?'model-open':value===null||softbonus===null?'model-open':value>=95&&softbonus>=95?'on-track':value>=90&&softbonus>=90?'watch':'below';
     if(scope.focus!=='all'&&scope.focus!==focus)return[];
     return[{person:{id:person.external_id,market:a.market,group:r.department_id,shift:0},name:person.name,recordId:r.assignment_id,achievement:value,softbonus,premium,focus,report:weekly?undefined:reportFromRow(r),metrics:r.payload.metrics.map(m=>({...m,resultState:'resultState' in m?m.resultState:'value',achievement:'achievement' in m?m.achievement:(m as import('./weeklyTargets').WeeklyTarget).actual!==null&&(m as import('./weeklyTargets').WeeklyTarget).target!==null&&(m as import('./weeklyTargets').WeeklyTarget).target!>0?(m as import('./weeklyTargets').WeeklyTarget).actual!/(m as import('./weeklyTargets').WeeklyTarget).target!*100:null}))}];
    });
  }
 };
}
export function configVersions(data:AdminData):ConfigVersion[]{return data.configurations.map(c=>({id:c.id,group:c.department_id,setting:c.setting,effective:c.effective_from??c.effective_month??'',saved:c.created_at,note:c.note,metrics:c.definition.metrics,origin:'local'}));}
export function importVersions(data:AdminData):ImportVersion[]{return data.imports.map(i=>({id:i.id,group:i.department_id,month:i.month.slice(0,7),phase:i.phase,subtype:i.phase==='MONTH_FINALIZATION'?'Monthly Closing':'Progress-Tracker',sheet:i.sheet,filename:i.filename,saved:i.published_at??i.created_at,status:i.status==='published'?'released':'preview',fields:i.mapping.filter(m=>m.dataset!=='ignore').map(m=>m.column+' → '+m.sourceLabel),mapping:Object.fromEntries(i.mapping.map(m=>[m.column,m.field])),columnMappings:i.mapping,changed:[i.phase],carried:[],closingSummary:{records:i.row_count,otherMonths:0,warnings:0},origin:'local'}));}

