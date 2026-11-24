import test from 'node:test';import assert from 'node:assert/strict';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {loadComponent} from './render-component.mjs';
const {CategoryHistoryCard}=await import(await loadComponent(new URL('../app/components/CategoryHistoryCard.tsx',import.meta.url)));
test('a historical division badge retains the circle content and labels the accessible month',()=>{
 const props={groupId:'LH',native:true,entries:[{id:'2026-07',short:'Jul',label:'Juli 2026',category:'SEC+',division:'HE'},{id:'2026-08',short:'Aug',category:'SEC+'}],historyPeriod:{fromMonth:'2025-09',throughMonth:'2026-08'}};
 const html=renderToStaticMarkup(createElement(CategoryHistoryCard,props));assert.equal((html.match(/data-history-division="HE"/g)??[]).length,1);assert.match(html,/Juli 2026: SEC\+, Division HE/);assert.match(html,/<small>Jul<\/small><strong>SEC\+<\/strong>/);assert.match(html,/category-node tier-silver/);
 const without=renderToStaticMarkup(createElement(CategoryHistoryCard,{...props,entries:props.entries.map(row=>({...row,division:undefined}))}));
 assert.deepEqual([...html.matchAll(/style="([^"]+)"/g)].map(m=>m[1]),[...without.matchAll(/style="([^"]+)"/g)].map(m=>m[1]));assert.doesNotMatch(without,/category-division-badge/);
});
