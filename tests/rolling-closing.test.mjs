import assert from 'node:assert/strict';
import test from 'node:test';
import {activeReports,annualClosing,closingFixtures,rollingClosing,historyMonthTier} from '../app/lib/monthlyClosing.ts';

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
