import test from 'node:test';import assert from 'node:assert/strict';
import {activeWeeklyRows,currentTargets,targetProgressHistory} from '../app/lib/weeklyTargets.ts';
const metric=(key,actual)=>({key,label:key,unit:'Stück',weight:100,target:20,actual,block:key.startsWith('he-')?'HE':'IM'});
const stand=(id,asOf,key,actual,updatedAt=asOf+'T08:00:00Z')=>({id,asOf,month:'2026-11',groupId:'LH',setting:'full',updatedAt,metrics:[metric(key,actual)]});
test('the API adapter keeps HE and IM at the same date while replacing a correction only within its source',()=>{
 const row=(id,sourceGroup,revision)=>({id,assignment_id:'own',month:'2026-11',as_of:'2026-11-07',revision,payload:{sourceGroup}});
 const active=activeWeeklyRows([row('he1','HE',1),row('im1','IM',2),row('he2','HE',3)]);
 assert.deepEqual(new Set(active.map(r=>r.id)),new Set(['he2','im1']));
});
test('LH current targets combine independently dated HE and IM blocks without copying old-month values',()=>{
 const current=currentTargets([stand('he','2026-11-07','he-units',8),stand('im','2026-11-09','im-flagship',12)],'LH','full','2026-11-17');
 assert.deepEqual(current.metrics.map(m=>[m.key,m.actual,m.sourceAsOf]),[['he-units',8,'2026-11-07'],['im-flagship',12,'2026-11-09']]);
 assert.equal(currentTargets([stand('he','2026-11-07','he-units',8)],'LH','full','2026-12-01'),null);
});
test('LH weekly improvement follows only that block and active correction, preserving signed and zero values',()=>{
 const snapshots=[stand('he1','2026-11-03','he-units',-2),stand('im','2026-11-05','im-flagship',9),stand('he2','2026-11-10','he-units',10),stand('correction','2026-11-10','he-units',0,'2026-11-11T08:00:00Z')];
 const history=targetProgressHistory(snapshots,'LH','full','2026-11-17','he-units');assert.equal(history.length,2);assert.equal(history[1].actual,0);assert.equal(history[1].change,2);assert.equal(history[1].previousAsOf,'2026-11-03');
 assert.equal(currentTargets(snapshots,'LH','full','2026-11-17').metrics.find(m=>m.key==='im-flagship').actual,9);
});
test('an explicit LH missing result remains missing; future component deliveries are not shown early',()=>{
 const snapshots=[stand('old','2026-11-03','he-units',5),stand('missing','2026-11-10','he-units',null),stand('future','2026-11-16','im-flagship',20,'2026-11-20T08:00:00Z')];
 const current=currentTargets(snapshots,'LH','full','2026-11-17');assert.equal(current.metrics[0].actual,null);assert.equal(current.metrics.length,1);
});
