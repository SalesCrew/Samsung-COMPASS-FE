import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {performanceHistory} from '../app/lib/performanceHistory.ts';
import {closingFixtures} from '../app/lib/monthlyClosing.ts';
import {DEFAULT_FILTERS} from '../app/lib/dashboard.ts';
import {SEC_GROUPS} from '../app/lib/groups.ts';
import {loadComponent} from './render-component.mjs';

test('history spans twelve calendar months across a year boundary and excludes future/foreign rows',()=>{
 const reports=closingFixtures('HE');const original=JSON.stringify(reports);
 const rows=performanceHistory([...reports,...closingFixtures('IM')],'2026-02','HE');
 assert.equal(rows.length,12);assert.equal(rows[0].month,'2025-03');assert.equal(rows.at(-1).month,'2026-02');
 assert.ok(rows.every(r=>!r.report||r.report.groupId==='HE'));assert.equal(rows[0].report,undefined);assert.equal(JSON.stringify(reports),original);
});
test('active corrections occur once and missing, zero, negative and above-target values stay distinct',()=>{
 const reports=closingFixtures('HE','full','old-correction');
 const latest={...reports.find(r=>r.month==='2026-09'),sellout:-8.5,softbonus:145.6};
 const rows=performanceHistory([...reports.filter(r=>r.month!=='2026-09'),latest],'2026-09','HE');
 assert.equal(rows.find(r=>r.month==='2026-07').report.revision,2);assert.equal(rows.filter(r=>r.month==='2026-07').length,1);
 assert.equal(rows.at(-1).sellout,-8.5);assert.equal(rows.at(-1).softbonus,145.6);
 assert.equal(performanceHistory([],'2026-09','HE')[0].sellout,null);
 assert.equal(performanceHistory(closingFixtures('HE','full','zero'),'2026-09','HE').at(-1).sellout,0);
 assert.ok(performanceHistory(closingFixtures('ST'),'2026-09','ST').every(r=>r.sellout===null));
});
test('production chart retains rules, update switch and exact accessible values with a concise centered readout',async()=>{
 const {PerformanceChart}=await import(await loadComponent(new URL('../app/components/PerformanceChart.tsx',import.meta.url)));
 for(const group of SEC_GROUPS){
  const html=renderToStaticMarkup(React.createElement(PerformanceChart,{group,filters:DEFAULT_FILTERS,reports:closingFixtures(group.id),onOpenRules:()=>{}}));
  assert.match(html,/Okt 2025 – Sep 2026/);assert.match(html,/Alle Werte/);assert.match(html,/Monate/);assert.match(html,/Updates/);
  assert.doesNotMatch(html,/Seitlich wischen|Monaten vollständig|Werte in %|Monatsabschluss<\/span>/);
  assert.equal((html.match(/<tr>/g)||[]).length,13);
  if(group.id==='ST')assert.doesNotMatch(html,/Sell-out|performance-chart-info/);
  else assert.match(html,/performance-chart-info/);
 }
});
