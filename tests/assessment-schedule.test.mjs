import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {assessmentCalendar,assessmentKind,scheduledSoftbonus} from '../app/lib/assessmentSchedule.ts';
import {closingFixtures} from '../app/lib/monthlyClosing.ts';
import {SEC_GROUPS} from '../app/lib/groups.ts';
import {DEFAULT_FILTERS} from '../app/lib/dashboard.ts';
import {loadComponent} from './render-component.mjs';

// Deliberately fictional criterion fixtures, never copied employee rows.
const criterion=(key,achievement=null,resultState='missing',label)=>({key,label:label??(key==='softbonus.wissenstest'?'Wissenstest':key==='softbonus.mystery-shopping'?'Mystery Shopping':key),achievement,resultState,unit:'%',actual:null,target:null,weight:null,icon:'check'});
const W=(n=null,s='missing')=>criterion('softbonus.wissenstest',n,s);
const M=(n=null,s='missing')=>criterion('softbonus.mystery-shopping',n,s);

test('the confirmed monthly cycle follows the closing month in all five divisions, including year changes',()=>{
 for(const group of ['HE','DA','IM','LH','ST']){
  for(let month=1;month<=12;month++){
   const p=assessmentCalendar('2026-'+String(month).padStart(2,'0'),group);
   assert.equal(p.current,month%2===0?'knowledge':'mystery');assert.notEqual(p.current,p.next);
  }
  assert.deepEqual(assessmentCalendar('2026-12',group),{current:'knowledge',next:'mystery',currentLabel:'Wissenstest',nextLabel:'Mystery Shopping',nextMonth:'2027-01'});
  assert.equal(assessmentCalendar('2027-01',group).nextMonth,'2027-02');
 }
 for(const month of ['garbage','2026-00','2026-13','2025-06'])assert.equal(assessmentCalendar(month,'HE'),null);
 assert.equal(assessmentCalendar('2026-09','Unknown'),null);
});
test('the inactive source column is explained separately without changing scores, states or applicable counts',()=>{
 for(const group of ['HE','DA','IM','LH','ST']){
  const original=[W(null,'not-applicable'),M(93,'value')],saved=JSON.stringify(original);
  const p=scheduledSoftbonus(original,group,'2026-09');assert.deepEqual(p.metrics,[original[1]]);
  assert.deepEqual(p.next,{label:'Wissenstest',month:'2026-10',currentKey:'softbonus.mystery-shopping'});assert.equal(JSON.stringify(original),saved);
  const even=scheduledSoftbonus([W(95,'value'),M()],group,'2026-08');assert.equal(even.next.label,'Mystery Shopping');assert.equal(even.next.month,'2026-09');assert.equal(even.metrics.length,1);
 }
});
test('real zero, source exceptions and invalid values override planned absence',()=>{
 const actualZero=scheduledSoftbonus([W(null,'not-applicable'),M(0,'value')],'IM','2026-09');assert.equal(actualZero.metrics[0].achievement,0);assert(actualZero.next);
 for(const value of [0,80,100]){
  const input=[W(value,'value'),M(94,'value')];const p=scheduledSoftbonus(input,'DA','2026-09');assert.deepEqual(p.metrics,input);assert.equal(p.next,null);
 }
 const invalid=[W(null,'invalid'),M(94,'value')];assert.deepEqual(scheduledSoftbonus(invalid,'HE','2026-09'),{metrics:invalid,next:null});
});
test('comments remain attached to their own upcoming criterion, without changing the source',()=>{
 const note={text:'Anmerkung zur nächsten Bewertung',sheet:'Pivot Liste',cell:'N3'};
 const waiting={...W(null,'not-applicable'),comments:[note]};
 const p=scheduledSoftbonus([waiting,M(94,'value')],'HE','2026-09');
 assert.deepEqual(p.next.comments,[note]);assert.equal(p.metrics[0].comments,undefined);assert.equal(waiting.resultState,'not-applicable');
});
test('current missing results stay pending; no participation, disabled fields and custom criteria are not fabricated',()=>{
 const pending=scheduledSoftbonus([W(null,'not-applicable'),M()],'ST','2026-09');assert.equal(pending.metrics.length,1);assert.equal(pending.metrics[0].resultState,'missing');assert(pending.next);
 assert.deepEqual(scheduledSoftbonus([W(null,'not-applicable'),M(null,'not-applicable')],'ST','2026-05'),{metrics:[],next:null});
 assert.equal(scheduledSoftbonus([M(95,'value')],'HE','2026-09').next,null);
 const custom=[criterion('softbonus.config.custom',null,'missing','Wissenstest')];assert.deepEqual(scheduledSoftbonus(custom,'HE','2026-09'),{metrics:custom,next:null});
 assert.equal(scheduledSoftbonus([W(),M()],'HE','2025-06').next,null);
});
test('the combined model gets an explicit current label but delivered contradictory labels remain authoritative',()=>{
 const combined=criterion('knowledge',0,'value','Mystery Shopping / Wissenstest');
 const p=scheduledSoftbonus([combined],'IM','2026-09');assert.equal(p.metrics[0].label,'Mystery Shopping');assert.equal(p.metrics[0].achievement,0);assert.equal(p.next.label,'Wissenstest');assert.equal(combined.label,'Mystery Shopping / Wissenstest');
 const given=criterion('knowledge',91,'value','Wissenstest');assert.deepEqual(scheduledSoftbonus([given],'IM','2026-09'),{metrics:[given],next:null});
 assert.equal(assessmentKind(p.metrics[0]),'mystery');assert.equal(assessmentKind(given),'knowledge');
});

const {ClosingMetricExplorer}=await import(await loadComponent(new URL('../app/components/ClosingMetricExplorer.tsx',import.meta.url)));
const render=(metrics,kind='criteria',month='2026-09')=>{
 const report={...closingFixtures('HE').at(-1),month};
 return renderToStaticMarkup(createElement(ClosingMetricExplorer,{title:'Softbonus',note:'Gelieferte Kriterien',metrics,report,reports:[report],kind}));
};
test('the actual card separates next month from scored criteria and retains the orange zero and true pending state',()=>{
 const html=render([W(null,'not-applicable'),M(0,'value')]);
 assert.match(html,/1 Kriterien/);assert.match(html,/Mystery Shopping: 0%/);assert.match(html,/data-threshold-reached="false"/);
 assert.match(html,/data-assessment-next="2026-10"/);assert.match(html,/Nächsten Monat dran · Oktober 2026/);
 assert.doesNotMatch(html,/data-metric="softbonus.wissenstest"/);
 const pending=render([W(),M()]);assert.match(pending,/Mystery Shopping: Noch kein Wert/);assert.match(pending,/Nächsten Monat dran/);
 assert.doesNotMatch(render([W(),M()],'kpi'),/Nächsten Monat dran/);
 assert.doesNotMatch(render([W(null,'not-applicable'),M(null,'not-applicable')]),/Nächsten Monat dran/);
});

const {MonthlyDashboard}=await import(await loadComponent(new URL('../app/components/MonthlyDashboard.tsx',import.meta.url)));
test('the full ST dashboard retains the source pair until the qualitative explorer plans the next month',()=>{
 const group=SEC_GROUPS.find(g=>g.id==='ST'),criteria=[W(null,'not-applicable'),M(94,'value')];
 const report={...closingFixtures('ST').at(-1),metrics:criteria,qualitative:criteria};
 const html=renderToStaticMarkup(createElement(MonthlyDashboard,{group,report,reports:[report],filters:{...DEFAULT_FILTERS,kpi:'all'},calendarDay:'2026-11-17',targetSnapshots:[],unread:false,latestUnread:null,onDetails(){},onLatest(){},onOpenRules(){},rulesOpen:false,onTargetsView(){},realData:true}));
 assert.match(html,/data-assessment-next="2026-10"/);assert.match(html,/Nächsten Monat dran · Oktober 2026/);
 assert.match(html,/Mystery Shopping: 94%/);assert.doesNotMatch(html,/data-metric="softbonus.wissenstest"/);
});
