import test from 'node:test';
import assert from 'node:assert/strict';
import {readTargetPeriod,targetPeriodFromTitle,targetPeriodLabel,sameTargetPeriod,summarizeTargetPeriods,targetPeriodForStand} from '../app/lib/targetPeriod.ts';
import {targetPeriodProblems} from '../app/lib/importFeedback.ts';
import {currentTargets,targetProgressHistory} from '../app/lib/weeklyTargets.ts';
const period={from:'2026-09-28',through:'2026-11-01'};
test('target windows may cross months or years, without inferring them from EDI coverage',()=>{
 assert.deepEqual(readTargetPeriod(period),period);
 assert.equal(targetPeriodLabel(period),'28.09.–01.11.2026');
 assert.deepEqual(targetPeriodFromTitle('HE SEC Monthly 202610 (28.09. - 01.11.2026)'),period);
 assert.deepEqual(targetPeriodFromTitle('HE SEC Monthly 202701 (28.12. - 31.01.2027)'),{from:'2026-12-28',through:'2027-01-31'});
 assert.equal(targetPeriodFromTitle('EDI Data period 01.10.2026 - 15.10.2026'),null);
 assert.equal(targetPeriodFromTitle('HE SEC Monthly 202610'),null);
 for(const value of [{from:'2026-02-30',through:'2026-03-01'},{from:'2026-11-01',through:'2026-10-01'},{...period,unexpected:true}])assert.equal(readTargetPeriod(value),null);
 assert.deepEqual(readTargetPeriod({from:'2027-01-01',through:'2027-01-31'}),{from:'2027-01-01',through:'2027-01-31'});
 assert.deepEqual(targetPeriodProblems('',''),[]);
 assert.equal(targetPeriodProblems('2026-09-28','')[0].target,'targetThrough');
 assert.equal(targetPeriodProblems('',period.through)[0].target,'targetFrom');
 assert.deepEqual(targetPeriodProblems(period.from,period.through),[]);
});
const snapshot=(day,block='HE',targetPeriod=period)=>({id:day+block,groupId:'LH',setting:'full',month:'2026-10',asOf:'2026-10-'+day,updatedAt:'2026-10-'+day+'T08:00:00Z',targetPeriod,sourceGroup:block,metrics:[{key:block.toLowerCase()+'-units',label:'Units',unit:'Stück',weight:100,actual:Number(day),target:50,icon:'check',block}]});
test('LH keeps each informational source period without changing weekly deltas',()=>{
 const other={from:'2026-10-01',through:'2026-10-31'},rows=[snapshot('08'),snapshot('15','IM',other)];
 const current=currentTargets(rows,'LH','full','2026-10-20');
 assert.deepEqual(current.metrics.find(m=>m.key==='he-units').sourceTargetPeriod,period);
 assert.deepEqual(current.metrics.find(m=>m.key==='im-units').sourceTargetPeriod,other);
 const history=targetProgressHistory([snapshot('08'),snapshot('15','HE',other)],'LH','full','2026-10-20','he-units');
 assert.equal(history[1].change,7);
 assert.equal(targetProgressHistory([snapshot('08'),snapshot('15')],'LH','full','2026-10-20','he-units')[1].change,7);
 assert.equal(sameTargetPeriod(undefined,undefined),true);
 assert.deepEqual(summarizeTargetPeriods([period,undefined]),{period,known:1,total:2,different:false});
 assert.deepEqual(summarizeTargetPeriods([period,other]),{period:null,known:2,total:2,different:true});
});

test('the informational period never hides targets or changes their weekly progress',()=>{
 const hint={from:'2027-01-01',through:'2027-01-02'};
 const first=snapshot('08','HE',hint),second=snapshot('15','HE',undefined);
 delete second.targetPeriod;
 assert.equal(currentTargets([first,second],'LH','full','2026-10-08').metrics[0].actual,8);
 assert.equal(currentTargets([first,second],'LH','full','2026-10-31').metrics[0].actual,15);
 assert.equal(targetProgressHistory([first,second],'LH','full','2026-10-31','he-units')[1].change,7);
 assert.deepEqual(targetPeriodProblems(hint.from,hint.through),[]);
 const expired=[snapshot('08','HE',{from:'2026-10-01',through:'2026-10-02'})];
 assert.equal(currentTargets(expired,'LH','full','2026-10-31').metrics[0].actual,8);
});

test('a blank weekly upload keeps only its own monthly information while numbers and deltas remain current',()=>{
 const first=snapshot('08'),later=snapshot('15');delete later.targetPeriod;
 const current=currentTargets([first,later],'LH','full','2026-10-20');assert.equal(current.metrics[0].actual,15);assert.deepEqual(current.metrics[0].sourceTargetPeriod,period);
 const regular=[first,later].map(s=>({...s,groupId:'HE',sourceGroup:undefined}));assert.deepEqual(currentTargets(regular,'HE','full','2026-10-20').targetPeriod,period);
 assert.equal(targetProgressHistory([first,later],'LH','full','2026-10-20','he-units')[1].change,7);
 const im=snapshot('15','IM');delete im.targetPeriod;assert.equal(currentTargets([first,im],'LH','full','2026-10-20').metrics.find(m=>m.key==='im-units').sourceTargetPeriod,null);
 const november={...later,month:'2026-11',asOf:'2026-11-15',updatedAt:'2026-11-15T08:00:00Z'};assert.equal(currentTargets([first,november],'LH','full','2026-11-20').metrics[0].sourceTargetPeriod,null);
});

test('explicit removal, invalid notes, new settings and superseded same-date information never revive an old note',()=>{
 const base={month:'2026-10',setting:'full',groupId:'HE',assignmentId:'a',asOf:'2026-10-08',updatedAt:'2026-10-08T08:00:00Z',targetPeriod:period},later={...base,asOf:'2026-10-15',updatedAt:'2026-10-15T08:00:00Z',targetPeriod:undefined};
 assert.equal(targetPeriodForStand({...later,targetPeriod:null},[base]),null);
 assert.equal(targetPeriodForStand({...later,targetPeriod:{from:'bad',through:'bad'}},[base]),null);
 assert.equal(targetPeriodForStand({...later,setting:'vc'},[base]),null);
 assert.equal(targetPeriodForStand({...later,assignmentId:'b'},[base]),null);
 const cleared={...base,targetPeriod:null,updatedAt:'2026-10-09T08:00:00Z'};assert.equal(targetPeriodForStand(later,[base,cleared]),null);
 assert.equal(targetPeriodForStand({...base,targetPeriod:undefined,updatedAt:'2026-10-09T08:00:00Z'},[base]),null);
});

test('notes clearly distinguish known, partial, different and missing information',async()=>{
 const {loadComponent}=await import('./render-component.mjs'),React=await import('react'),{renderToStaticMarkup}=await import('react-dom/server'),{TargetPeriodNote}=await import(await loadComponent(new URL('../app/components/TargetPeriodNote.tsx',import.meta.url)));
 const render=props=>renderToStaticMarkup(React.createElement(TargetPeriodNote,props));
 assert.equal(render({}), '');assert.match(render({showMissing:true}),/Zielzeitraum noch nicht hinterlegt/);
 const partial=render({coverage:{period,known:1,total:2,different:false}});assert.match(partial,/data-target-period-state="partial"/);assert.match(partial,/1 von 2 SEC/);
 const different=render({coverage:{period:null,known:0,total:2,different:true},showMissing:true});assert.match(different,/Unterschiedliche Zielzeiträume hinterlegt/);assert.doesNotMatch(different,/0 von 2|data-target-period=/);
 assert.match(render({period,coverage:{period:null,known:0,total:2,different:false},showMissing:true}),/noch nicht hinterlegt/);
});
