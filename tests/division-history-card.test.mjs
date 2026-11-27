import test from 'node:test';import assert from 'node:assert/strict';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {loadComponent} from './render-component.mjs';
const {CategoryHistoryCard}=await import(await loadComponent(new URL('../app/components/CategoryHistoryCard.tsx',import.meta.url)));
test('a historical division badge retains the circle content and labels the accessible month',()=>{
 const props={groupId:'LH',native:true,entries:[{id:'2026-07',short:'Jul',label:'Juli 2026',category:'SEC+',division:'HE'},{id:'2026-08',short:'Aug',category:'SEC+'}],historyPeriod:{fromMonth:'2025-09',throughMonth:'2026-08'}};
 const html=renderToStaticMarkup(createElement(CategoryHistoryCard,props));assert.equal((html.match(/data-history-division="HE"/g)??[]).length,1);assert.match(html,/Juli 2026: SEC\+, Division HE/);assert.match(html,/<small>Jul<\/small><strong>SEC\+<\/strong>/);assert.match(html,/category-node tier-silver/);
 const without=renderToStaticMarkup(createElement(CategoryHistoryCard,{...props,entries:props.entries.map(row=>({...row,division:undefined}))}));
 assert.deepEqual([...html.matchAll(/style="([^"]+)"/g)].map(m=>m[1]),[...without.matchAll(/style="([^"]+)"/g)].map(m=>m[1]));assert.doesNotMatch(without,/category-division-badge/);
});

test('a shorter recorded history labels the source coverage without changing circle geometry',()=>{
 const props={groupId:'HE',native:true,entries:[{id:'2026-10',label:'Oktober 2026',short:'Okt',category:'SEC',partialLevel:true,knownMonths:8}]};
 const html=renderToStaticMarkup(createElement(CategoryHistoryCard,props));assert.match(html,/Stand aus 8 erfassten Monaten im Zwölfmonatsfenster/);assert.match(html,/Oktober 2026: SEC, Stand aus 8 erfassten Monaten/);assert.match(html,/Level bei kürzerer Historie: Stand der erfassten Monate/);assert.match(html,/category-node tier-bronze/);
});

test('confirmed absence circles remain visible as dashes without becoming a missing-evidence warning',()=>{
 const entries=['2026-06','2026-07','2026-08'].map((id,i)=>({id,label:id,short:['Jun','Jul','Aug'][i],category:'—',absence:true}));
 const html=renderToStaticMarkup(createElement(CategoryHistoryCard,{groupId:'IM',native:true,entries,historyPeriod:{fromMonth:'2025-09',throughMonth:'2026-08'}}));
 assert.equal((html.match(/data-participation="absent"/g)??[]).length,3);
 assert.equal((html.match(/<strong>—<\/strong>/g)??[]).length,3);
 assert.match(html,/nicht teilgenommen/);assert.doesNotMatch(html,/Noch kein SEC-Level verfügbar|fehlt ein belegtes SEC-Level/);
});


test('months before a confirmed start retain their dash circles without an evidence warning',()=>{
 const entries=[{id:'2026-08',short:'Aug',category:'—',beforeStart:true},{id:'2026-09',short:'Sep',category:'SEC',market:'Alter Markt'}];
 const html=renderToStaticMarkup(createElement(CategoryHistoryCard,{groupId:'HE',native:true,entries,historyPeriod:{fromMonth:'2025-10',throughMonth:'2026-09'}}));
 assert.match(html,/data-participation="not-started"/);assert.match(html,/<strong>—<\/strong>/);assert.match(html,/Vor SEC-Beginn/);assert.match(html,/vor deinem SEC-Beginn/);assert.match(html,/Markt Alter Markt/);assert.doesNotMatch(html,/fehlt ein belegtes SEC-Level/);
});
