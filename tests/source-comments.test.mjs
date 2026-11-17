import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadComponent} from './render-component.mjs';
import {groupProjectAssessment,PROJECT_ASSESSMENT_ITEMS} from '../app/lib/projectAssessment.ts';
import {currentTargets} from '../app/lib/weeklyTargets.ts';
const {SourceComments}=await import(await loadComponent(new URL('../app/components/SourceComments.tsx',import.meta.url)));
const render=comments=>renderToStaticMarkup(createElement(SourceComments,{comments}));
const comment=text=>[{text,sheet:'Pivot Liste',cell:'N3'}];

test('source explanations render as readable literal text and no placeholder appears without a note',()=>{
 assert.equal(render(undefined),'');assert.equal(render([]),'');
 const html=render(comment('First line\n<img src=x onerror=alert(1)>'));
 assert.match(html,/Kommentar aus Excel/);assert.match(html,/First line\n&amp;lt;|First line\n&lt;/);
 assert.doesNotMatch(html,/<img|onerror="/);assert.doesNotMatch(html,/Pivot Liste|N3/);
});
test('PL child grouping preserves the exact original note with its own score',()=>{
 const child={key:PROJECT_ASSESSMENT_ITEMS[0][0],label:'Child',achievement:80,resultState:'value',comments:comment('Exact child explanation')};
 const rows=[{key:'softbonus.pl-bewertung',label:'Parent',achievement:93,resultState:'value'},child];
 const result=groupProjectAssessment(rows);assert.equal(result[0].achievement,93);assert.equal(result[0].details[0].achievement,80);assert.deepEqual(result[0].details[0].comments,child.comments);
});
test('weekly replacement clears an earlier comment when the new dated update has none',()=>{
 const base={groupId:'HE',setting:'full',month:'2026-11',updatedAt:'2026-11-08T08:00:00Z'};
 const old={...base,id:'old',asOf:'2026-11-08',metrics:[{key:'units',target:10,actual:0,comments:comment('Only this stand')}]};
 const latest={...base,id:'new',asOf:'2026-11-15',updatedAt:'2026-11-15T08:00:00Z',metrics:[{key:'units',target:10,actual:5}]};
 assert.equal(currentTargets([old,latest],'HE','full','2026-11-17').metrics[0].comments,undefined);
 assert.equal(currentTargets([old],'HE','full','2026-12-01'),null);
});
