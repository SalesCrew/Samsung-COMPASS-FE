import type { CellComment } from './excelComments.ts';
import { visibleSoftbonus } from './personalSoftbonus.ts';

export type AssessmentKind = 'knowledge' | 'mystery';
type Metric = { key:string; label:string; resultState:string; achievement:number|null; comments?:CellComment[] };
export type NextAssessment = { label:string; month:string; currentKey:string; comments?:CellComment[] };
const labels:Record<AssessmentKind,string>={knowledge:'Wissenstest',mystery:'Mystery Shopping'};
const sourceKeys:Record<AssessmentKind,string>={knowledge:'softbonus.wissenstest',mystery:'softbonus.mystery-shopping'};
const groups=new Set(['HE','DA','IM','LH','ST']);

/** Monthly alternation confirmed in the 16 Nov meeting. Phase verified against
 * Pivot Liste M:O in the original June/August/September 2026 closings, covering
 * July 2025–September 2026. Published individual results always take precedence.
 * Evidence and the historical DA exception: docs/assessment-schedule.md. */
export function assessmentCalendar(month:string,division:string){
 if(!groups.has(division)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||month<'2025-07')return null;
 const year=Number(month.slice(0,4)),m=Number(month.slice(5));
 const current:AssessmentKind=m%2===0?'knowledge':'mystery';
 const next:AssessmentKind=current==='knowledge'?'mystery':'knowledge';
 return{current,next,currentLabel:labels[current],nextLabel:labels[next],nextMonth:(m===12?year+1:year)+'-'+String(m===12?1:m+1).padStart(2,'0')};
}

/** Only original source keys and the existing combined model criterion qualify. */
export function assessmentKind(metric:Pick<Metric,'key'|'label'>):AssessmentKind|null{
 if(metric.key===sourceKeys.knowledge)return'knowledge';
 if(metric.key===sourceKeys.mystery)return'mystery';
 if(metric.key!=='knowledge')return null;
 const label=metric.label.trim().toLowerCase();
 return label==='wissenstest'||label==='knowledge test'?'knowledge':label==='mystery shopping'?'mystery':null;
}
const combined=(metric:Metric)=>metric.key==='knowledge'&&/^(?:wissenstest\s*\/\s*mystery shopping|mystery shopping\s*\/\s*wissenstest)$/i.test(metric.label.trim());

/** Display projection: no scores, source states, weights or saved payloads change.
 * A next-month notice is separate from applicable criteria and their averages. */
export function scheduledSoftbonus<T extends Metric>(supplied:readonly T[],division:string,month:string):{metrics:T[];next:NextAssessment|null}{
 const metrics=visibleSoftbonus(supplied,division);
 const plan=assessmentCalendar(month,division);
 if(!plan)return{metrics,next:null};
 const due=supplied.find(metric=>metric.key===sourceKeys[plan.current]);
 const later=supplied.find(metric=>metric.key===sourceKeys[plan.next]);
 if(due&&later){
  const waiting=later.achievement===null&&(later.resultState==='missing'||later.resultState==='not-applicable');
  if(due.resultState!=='not-applicable'&&waiting)return{
   metrics:metrics.filter(metric=>metric.key!==later.key),
   next:{label:later.label,month:plan.nextMonth,currentKey:due.key,...(later.comments?.length?{comments:later.comments}:{})},
  };
  return{metrics,next:null};
 }
 // A disabled/unmapped counterpart is not silently invented.
 if(due||later)return{metrics,next:null};
 const model=metrics.find(metric=>metric.key==='knowledge');
 if(!model||model.resultState==='not-applicable')return{metrics,next:null};
 const deliveredKind=assessmentKind(model);
 if(!combined(model)&&deliveredKind!==plan.current)return{metrics,next:null};
 return{
  metrics:metrics.map(metric=>metric===model&&combined(metric)?{...metric,label:plan.currentLabel}:metric),
  next:{label:plan.nextLabel,month:plan.nextMonth,currentKey:model.key},
 };
}
