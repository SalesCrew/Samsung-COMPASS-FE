import test from 'node:test';import assert from 'node:assert/strict';
import {rollingPremiums,activeReports,closingFixtures,previousMonth} from '../app/lib/monthlyClosing.ts';
import {groupProjectAssessment,PROJECT_ASSESSMENT_ITEMS,presentationProjectDetails} from '../app/lib/projectAssessment.ts';
function history(end){let month=end;const rows=[];for(let i=0;i<12;i++){rows.unshift({month,premium:100,extrasAvailable:true,extras:[{type:'On-top',amount:5}]});month=previousMonth(month);}return rows;}
test('both premiums use the selected rolling twelve months across year boundaries, not YTD',()=>{
 for(const end of ['2026-01','2026-02','2027-01']){const rows=history(end);const value=rollingPremiums([...rows,{...rows[0],month:previousMonth(rows[0].month),premium:900},{...rows.at(-1),month:end.slice(0,4)+'-12',premium:1000}],end);assert.equal(value.premium,1200);assert.equal(value.extras,60);assert.equal(value.knownMonths,12);assert.equal(value.partial,false);assert.equal(value.throughMonth,end);assert.equal(value.fromMonth,rows[0].month);}
});
test('unknown months and separate unknown extras stay partial; real zero remains known',()=>{
 const rows=history('2026-09');rows[0].premium=null;rows[1].extrasAvailable=false;rows[2].premium=0;
 const partial=rollingPremiums(rows.slice(1),'2026-09');assert.equal(partial.knownMonths,11);assert.equal(partial.extrasKnownMonths,10);assert.equal(partial.premium,1000);assert.equal(partial.extras,50);assert(partial.partial);
 assert.equal(rollingPremiums([],'2026-09').premium,null);assert.equal(rollingPremiums([],'2026-09').extras,null);
 const latest={...rows.at(-1),premium:0,extras:[]};assert.equal(rollingPremiums([latest],latest.month).premium,0);assert.equal(rollingPremiums([latest],latest.month).extras,0);
});
test('rolling premium UI inputs use active corrections once',()=>{
 const rows=closingFixtures('IM','full','correction');const active=activeReports(rows);const value=rollingPremiums(active,'2026-09');assert.equal(value.premium,active.reduce((s,r)=>s+r.premium,0));assert.equal(value.knownMonths,12);
});
test('source PL child rows move under the existing aggregate without changing their values or weights',()=>{
 const metric=(key,achievement,state='value')=>({key,label:key,achievement,resultState:state,weight:null});
 const parent=metric('softbonus.pl-bewertung',93);const children=PROJECT_ASSESSMENT_ITEMS.map(([key],i)=>metric(key,i===1?null:90+i,i===1?'missing':'value'));
 const input=[metric('softbonus.wissenstest',94),parent,...children,metric('softbonus.reporting',92)],before=JSON.stringify(input);
 const grouped=groupProjectAssessment(input);assert.equal(grouped.length,3);assert.equal(grouped[1].achievement,93);assert.equal(grouped[1].weight,null);assert.equal(grouped[1].details.length,6);assert.equal(grouped[1].details[1].achievement,null);assert.equal(grouped[1].details[1].resultState,'missing');assert.deepEqual(groupProjectAssessment(grouped),grouped);assert.equal(JSON.stringify(input),before);
 const noParent=groupProjectAssessment(children);assert.equal(noParent.length,6);
 const noDetails=groupProjectAssessment([parent]);assert.equal(noDetails[0].details,undefined);
});
test('only synthetic presentation fixtures provide fictional child values; each mean matches its aggregate',()=>{
 for(const score of [0,86,93,98,100]){const details=presentationProjectDetails(score);assert.equal(details.length,6);assert.equal(details.reduce((n,d)=>n+d.achievement,0)/6,score);assert.ok(details.every(d=>d.achievement>=0&&d.achievement<=100));}
});
