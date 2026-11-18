import test from 'node:test';
import assert from 'node:assert/strict';
import {readTargetPeriod,targetPeriodFromTitle,targetPeriodLabel,sameTargetPeriod,summarizeTargetPeriods} from '../app/lib/targetPeriod.ts';
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
