'use client';
import { createClient, type Session } from '@supabase/supabase-js';
import type { DASetting, SECGroup } from './groups';
import type { MonthlyReport } from './monthlyClosing';
import type { WeeklyTargetSnapshot } from './weeklyTargets';

export type SECAccount={user_id:string;email:string;display_name:string;role:'app_admin'|'department_admin'|'sec';department_ids:SECGroup['id'][];person_id:string|null;primary_department:SECGroup['id']|null;setting:DASetting;active:boolean;must_change_password:boolean;is_test:boolean;notice_version:string|null};
export type PublishedRow={id:string;person_id:string;assignment_id:string;department_id:SECGroup['id'];month:string;revision:number;published_at:string;import_id:string;payload:MonthlyReport & WeeklyTargetSnapshot};
export type Assignment={id:string;person_id:string;department_id:SECGroup['id'];setting:DASetting;market:string};
export type Person={id:string;external_id:string;name:string};
export type ConfigRow={id:string;department_id:SECGroup['id'];setting:DASetting;effective_month?:string;effective_from?:string;version:number;definition:{metrics:import('./admin').AdminMetric[]};note:string;created_at:string};
export type ImportRow={id:string;department_id:SECGroup['id'];month:string;phase:import('./admin').ImportPhase;as_of:string;filename:string;sheet:string;mapping:import('./admin').SourceColumnMapping[];status:'draft'|'published'|'rejected';row_count:number;created_at:string;published_at:string|null};
export type AdminData={reports:PublishedRow[];weekly:PublishedRow[];imports:ImportRow[];configurations:ConfigRow[];people:Person[];assignments:Assignment[]};
export type DashboardData={profile:SECAccount;assignments:Assignment[];selectedAssignment?:string;reports:PublishedRow[];weekly:PublishedRow[];read:{report_id:string}[];calendarDay:string;rankings?:Record<string,{pool:number;rank:number|null;outsideTopTen:boolean}>};
export class SECAPIError extends Error{status:number;code:string;constructor(message:string,status:number,code:string){super(message);this.status=status;this.code=code;}}
let browserAuth:ReturnType<typeof createClient>|undefined;
export function secAuth(){
 if(!browserAuth)browserAuth=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 return browserAuth;
}
export async function secRequest<T>(path:string,options:RequestInit={},session?:Session|null):Promise<T>{
 const token=session?.access_token;
 const response=await fetch((process.env.NEXT_PUBLIC_SEC_API_URL??'http://127.0.0.1:4320')+'/api'+path,{...options,cache:'no-store',headers:{...options.headers,...(token?{Authorization:'Bearer '+token}:{})}});
 const body=await response.json();if(!response.ok)throw new SECAPIError(body.error??'Anfrage fehlgeschlagen.',response.status,body.code??'REQUEST_FAILED');return body as T;
}
export function secPost<T>(path:string,body:unknown,session?:Session|null){return secRequest<T>(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)},session);}
export function reportFromRow(row:PublishedRow):MonthlyReport{
 return{...row.payload,extrasAvailable:row.payload.extrasAvailable??(row.payload.extras.length>0||['LH','ST'].includes(row.department_id)),reportId:row.assignment_id+'-'+row.month.slice(0,7),publicationId:row.id,revision:row.revision,groupId:row.department_id,month:row.month.slice(0,7),publishedAt:row.published_at};
}
export function weeklyFromRows(rows:PublishedRow[]):WeeklyTargetSnapshot[]{
 const active=new Map<string,PublishedRow>();
 for(const row of rows){const asOf=(row as PublishedRow & {as_of:string}).as_of;const key=row.assignment_id+'|'+row.month+'|'+asOf;const old=active.get(key);if(!old||row.revision>old.revision)active.set(key,row);}
 return[...active.values()].map(row=>({...row.payload,id:row.id,groupId:row.department_id,month:row.month.slice(0,7),asOf:(row as PublishedRow & {as_of:string}).as_of,updatedAt:row.published_at}));
}

