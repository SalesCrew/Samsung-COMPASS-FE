import assert from 'node:assert/strict';
import test from 'node:test';
import {activeReports,annualClosing,closingFixtures,rollingClosing,rollingLevelHistory,historyMonthTier} from '../app/lib/monthlyClosing.ts';

function history(end='2026-02',points=2){
 const row=closingFixtures('IM').at(-1),months=[];let date=new Date(end+'-01T00:00:00Z');
 for(let i=0;i<12;i++){months.unshift(date.toISOString().slice(0,7));date.setUTCMonth(date.getUTCMonth()-1);}
 return months.map(month=>({...row,month,points,sourceLevel:null,premium:100,extras:[{type:'On-top',amount:5}],extrasAvailable:true}));
}
test('history ring colors follow the supplied monthly category, with only known point awards as fallback',()=>{
 assert.equal(historyMonthTier(1),'bronze');assert.equal(historyMonthTier(2),'silver');assert.equal(historyMonthTier(3),'gold');
 for(const points of [null,0,-1,4,2.5,NaN])assert.equal(historyMonthTier(points),'unavailable');
 for(const tier of ['gold','silver','bronze','unresolved','unavailable'])assert.equal(historyMonthTier(3,{tier,points:3}),tier);
 assert.equal(historyMonthTier(3,{tier:'gold',points:null}),'unavailable');
 // SEC/SEC+/SEC Pro are rolling levels: they must not replace the monthly Gold/Silber/Bronze category.
 const rows=history('2026-09',3);assert.equal(rollingClosing(rows,rows.at(-1)).level,'SEC Pro');assert.equal(historyMonthTier(3,{tier:'bronze',points:1}),'bronze');
});
test('points and levels roll across January while premiums remain calendar-year scoped',()=>{
 const rows=history(),selected=rows.at(-1),rolling=rollingClosing(rows,selected),annual=annualClosing(rows,selected);
 assert.equal(rolling.fromMonth,'2025-03');assert.equal(rolling.throughMonth,'2026-02');
 assert.equal(rolling.points,24);assert.equal(rolling.level,'SEC+');assert.equal(rolling.partial,false);
 assert.equal(annual.premium,200);assert.equal(annual.extras,10);assert.equal(annual.year,'2026');
 assert.equal(annual.reports.length,2);assert.ok(!('points' in annual));
 const future={...selected,month:'2026-03',points:3};
 assert.equal(rollingClosing([...rows,future],selected).points,24);
 const next=rollingClosing([...rows,future],future);assert.equal(next.fromMonth,'2025-04');assert.equal(next.points,25);
});
test('empty source level fields derive from twelve actual point values; complete points determine the level',()=>{
 const rows=history('2026-09'),selected=rows.at(-1);
 for(const sourceLevel of [undefined,null,'','   ','SEC Pro','unknown']){
  const changed=rows.map((r,i)=>i===11?{...r,sourceLevel}:r);
  assert.equal(rollingClosing(changed,selected).level,'SEC+');
 }
 const zero=rows.map(r=>({...r,points:0}));assert.equal(rollingClosing(zero,selected).points,0);assert.equal(rollingClosing(zero,selected).level,'SEC');
 const gold=rows.map(r=>({...r,points:3}));assert.equal(rollingClosing(gold,selected).level,'SEC Pro');
 const unknownMoney=rows.map(r=>({...r,premium:null,extrasAvailable:false}));assert.equal(rollingClosing(unknownMoney,selected).partial,false);
});
test('missing or invalid history stays partial and never becomes an invented zero or level',()=>{
 const rows=history(),selected=rows.at(-1);
 const gap=rows.filter((r,i)=>i!==4),partial=rollingClosing(gap,selected);
 assert.equal(partial.knownMonths,11);assert.equal(partial.points,22);assert.equal(partial.level,null);assert.equal(partial.missing.length,1);
 for(const points of [null,undefined,NaN,Infinity,-1,4]){
  const invalid=rows.map((r,i)=>i===0?{...r,points}:r);assert.equal(rollingClosing(invalid,selected).level,null);
 }
 const supplied=gap.map((r,i)=>i===gap.length-1?{...r,sourceLevel:' SEC Pro '}:r);
 assert.equal(rollingClosing(supplied,selected).level,'SEC Pro');assert.equal(rollingClosing(supplied,selected).partial,true);
 assert.equal(rollingClosing([],selected).points,null);
 const st={...selected,groupId:'ST'};assert.equal(rollingClosing(rows,st).level,null);assert.equal(rollingClosing(rows,st).points,null);
});
test('the selected active correction replaces one month and rolling windows do not mutate input',()=>{
 const rows=history(),selected=rows.at(-1),original=JSON.stringify(rows);
 const corrected={...rows[0],revision:2,points:3,publicationId:'correction'};
 const active=activeReports([...rows,corrected,rows[0]]);
 assert.equal(rollingClosing(active,selected).points,25);assert.equal(active.length,12);
 assert.equal(JSON.stringify(rows),original);
 const january=history('2027-01',3);assert.equal(rollingClosing(january,january.at(-1)).points,36);
});
test('the level timeline retains twelve closing months and shows earned levels from a shorter recorded history',()=>{
 const rows=history('2026-10');
 for(const month of ['2025-07','2025-08','2025-09','2025-10'])rows.unshift({...rows[0],month});
 const original=JSON.stringify(rows),selected={month:'2026-10',groupId:'IM'};
 const timeline=rollingLevelHistory(rows,selected);
 assert.equal(timeline.length,12);assert.equal(timeline[0].month,'2025-11');assert.equal(timeline.at(-1).month,'2026-10');
 assert.deepEqual(timeline.slice(0,7).map(row=>row.level),[...Array(6).fill('SEC'),'SEC+']);
 assert(timeline.slice(0,7).every(row=>row.partialLevel));assert.equal(timeline[0].knownMonths,5);
 assert.deepEqual(timeline.slice(7).map(row=>row.level),Array(5).fill('SEC+'));
 assert.deepEqual(rollingLevelHistory([...rows,{...rows[0],month:'2026-11',points:3}],selected),timeline);
 assert.equal(JSON.stringify(rows),original);
 const september=rollingLevelHistory(rows,{month:'2026-09',groupId:'IM'});
 assert.equal(september[0].month,'2025-10');assert.equal(september.at(-1).month,'2026-09');
});
test('timeline gaps do not erase supplied historical levels or turn zero-point evidence into missing data',()=>{
 const rows=history('2026-10',0),selected={month:'2026-10',groupId:'IM'};
 assert.equal(rollingLevelHistory(rows,selected).at(-1).level,'SEC');
 const partial=rows.filter(row=>row.month!=='2026-06').map(row=>({...row,sourceLevel:row.month==='2025-11'?'SEC Pro':null}));
 const entries=rollingLevelHistory(partial,selected);
 assert.equal(entries[0].level,'SEC Pro');assert.equal(entries.find(row=>row.month==='2026-06').level,null);assert.equal(entries.at(-1).level,null);
});

test('former-division history is read in its own source division without mixing point windows',()=>{
 const selected={month:'2026-10',groupId:'LH'},own=history('2026-10',1),former=history('2026-07',3).map(row=>({...row,groupId:'HE'}));
 const levels=[...former,...own.filter(row=>row.month>'2026-07').map(row=>({...row,groupId:'LH'}))];const before=JSON.stringify(levels);
 const timeline=rollingLevelHistory(own,selected,levels);
 assert.equal(timeline.find(row=>row.month==='2026-07').level,'SEC Pro');assert.equal(timeline.find(row=>row.month==='2026-07').division,'HE');
 assert.equal(timeline.at(-1).level,'SEC');assert.equal(timeline.at(-1).knownMonths,3);assert(timeline.at(-1).partialLevel);assert.equal(timeline.at(-1).division,'LH');
 assert.equal(rollingClosing(own,selected).points,12);assert.equal(JSON.stringify(levels),before);
});
test('confirmed former role labels the circle without relabelling source data or changing totals',()=>{
 const own=history('2026-10',2).map(row=>({...row,groupId:'LH',division:row.month<='2026-07'?'HE':'LH'}));
 const selected={month:'2026-10',groupId:'LH'},baseline=rollingLevelHistory(own,selected),labelled=rollingLevelHistory(own,selected,own);
 assert.deepEqual(labelled.map(row=>row.level),baseline.map(row=>row.level));assert.equal(labelled.at(-1).level,'SEC+');
 assert.equal(labelled.find(row=>row.month==='2026-07').division,'HE');assert.equal(labelled.at(-1).division,'LH');assert.equal(rollingClosing(own,selected).points,24);
});
test('current-division rows take precedence, including unknowns; ambiguous prior divisions remain unproven',()=>{
 const own=history('2026-10',2).map(row=>({...row,groupId:'LH'})),selected={month:'2026-10',groupId:'LH'};
 const foreign=own.map(row=>({...row,groupId:'HE',points:3}));assert.equal(rollingLevelHistory(own,selected,[...own,...foreign]).at(-1).level,'SEC+');
 const missing=own.map(row=>row.month==='2026-10'?{...row,points:null}:row);assert.equal(rollingLevelHistory(own,selected,[...missing,...foreign]).at(-1).level,null);
 const ambiguous=[...foreign,...foreign.map(row=>({...row,groupId:'IM'}))];assert.equal(rollingLevelHistory(own,selected,ambiguous).at(-1).level,null);
 assert.equal(rollingLevelHistory(own,selected,[]).at(-1).level,null);
});

test('six recorded months earn a level without adding fake older rows or relaxing an interior missing value',()=>{
 const selected={month:'2026-10',groupId:'HE'},rows=history('2026-10',2).slice(-6),before=JSON.stringify(rows),result=rollingClosing(rows,selected);
 assert.equal(result.points,12);assert.equal(result.level,'SEC');assert.equal(result.knownMonths,6);assert.equal(result.partial,true);assert.equal(result.levelFromRecordedMonths,true);assert.equal(rows.length,6);assert.equal(JSON.stringify(rows),before);
 const timeline=rollingLevelHistory(rows,selected);assert(timeline.slice(0,6).every(row=>row.level===null));assert(timeline.slice(6).every(row=>row.level==='SEC'));assert(timeline.slice(6).every(row=>row.partialLevel));
 const withHole=rows.filter(row=>row.month!=='2026-08');assert.equal(rollingClosing(withHole,selected).level,null);
 const unknownStart=[{...rows[0],month:'2026-04',points:null},...rows];assert.equal(rollingClosing(unknownStart,selected).level,null);
 const invalid=rows.map(row=>row.month==='2026-08'?{...row,points:null}:row);assert.equal(rollingClosing(invalid,selected).level,null);
 const zero=rows.map(row=>({...row,points:0}));assert.equal(rollingClosing(zero,selected).points,0);assert.equal(rollingClosing(zero,selected).level,'SEC');
 assert.equal(rollingClosing(rows,{...selected,groupId:'ST'}).level,null);
});

test('confirmed absences keep calendar coverage without counting supplied source points and levels resume after return',()=>{
 const selected={month:'2026-10',groupId:'IM'},rows=history('2026-10',2);
 for(const month of ['2025-07','2025-08','2025-09','2025-10'])rows.unshift({...rows[0],month});
 const confirmed=rows.map(r=>['2026-06','2026-07','2026-08'].includes(r.month)?{...r,participation:'absent',sourcePoints:r.points}:r);
 const before=JSON.stringify(confirmed),progress=rollingClosing(confirmed,selected),timeline=rollingLevelHistory(confirmed,selected);
 assert.equal(progress.points,18);assert.equal(progress.knownMonths,12);assert.equal(progress.partial,false);assert.equal(progress.level,'SEC');
 for(const month of ['2026-06','2026-07','2026-08']){const row=timeline.find(r=>r.month===month);assert.equal(row.level,null);assert.equal(row.absence,true);}
 for(const month of ['2026-09','2026-10'])assert.equal(timeline.find(r=>r.month===month).level,'SEC');
 const levels=confirmed.map(r=>({...r,groupId:'IM'}));assert.deepEqual(rollingLevelHistory(confirmed,selected,levels).map(r=>[r.month,r.level,r.absence]),timeline.map(r=>[r.month,r.level,r.absence]));
 const missing=confirmed.map(r=>r.month==='2026-07'?{...r,points:null}:r);assert.equal(rollingClosing(missing,selected).partial,false);
 const stillUnknown=confirmed.map(r=>r.month==='2026-05'?{...r,points:null}:r);assert.equal(rollingClosing(stillUnknown,selected).level,null);
 assert.equal(JSON.stringify(confirmed),before);
});
