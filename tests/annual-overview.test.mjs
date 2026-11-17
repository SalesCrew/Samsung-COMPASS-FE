import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

// Render the actual card component without loading its unrelated timeline re-export.
const url=new URL('../app/components/AnnualOverview.tsx',import.meta.url);
const source=(await readFile(url,'utf8')).replace(/^export \{ CategoryHistoryCard[^\n]+\n/m,'');
let js=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
js=js.replace(/from ["']([^"']+)["']/g,(_all,path)=>'from '+JSON.stringify(path.startsWith('.')?new URL(path+'.ts',url).href:import.meta.resolve(path)));
const {AnnualPointsCard,LeaderboardCard}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const render=(component,props)=>renderToStaticMarkup(createElement(component,props));

test('the large ring uses the rolling SEC level and ignores a different monthly medal',()=>{
 const html=render(AnnualPointsCard,{points:26,currentLevel:'SEC+',tier:'gold',month:'September 2026',onOpenRules(){}});
 assert.match(html,/points-card tier-silver/);assert.match(html,/SEC\+ · Silber/);
 assert.doesNotMatch(html,/tier-gold|Gold|September 2026/);
 for(const [points,tier]of [[0,'bronze'],[20,'bronze'],[21,'silver'],[31,'silver'],[32,'gold'],[36,'gold']]){
  assert.match(render(AnnualPointsCard,{points,onOpenRules(){}}),new RegExp('points-card tier-'+tier));
 }
});
test('incomplete points do not invent a level; a supplied known level remains visible',()=>{
 const unknown=render(AnnualPointsCard,{points:6,currentLevel:null,incomplete:true,knownMonths:2,onOpenRules(){}});
 assert.match(unknown,/tier-unavailable/);assert.match(unknown,/SEC-Level noch offen/);assert.match(unknown,/2 von 12 Monaten/);
 assert.match(render(AnnualPointsCard,{points:6,currentLevel:'SEC+',incomplete:true,onOpenRules(){}}),/tier-silver/);
});
test('ranking explains the chosen closing cohort, missing histories and ambiguous points without peer data',()=>{
 const coverage={fromMonth:'2025-10',throughMonth:'2026-09',total:22,comparable:15,missingMonths:6,unclearPoints:1};
 const html=render(LeaderboardCard,{pool:15,rank:7,division:'HE',coverage});
 assert.match(html,/15 SEC mit vollständigen 12 Monaten/);assert.match(html,/Wer wird verglichen/);
 assert.match(html,/Oktober 2025 – September 2026/);assert.match(html,/SEC im gewählten Abschluss<\/dt><dd>22/);
 assert.match(html,/Monate fehlen<\/dt><dd>6/);assert.match(html,/Punkte fehlen oder sind uneindeutig<\/dt><dd>1/);
 assert.match(html,/heutige Zahl aktiver Zugänge/);assert.match(html,/Nur dein eigener Top-10-Platz/);
 const outside=render(LeaderboardCard,{pool:15,rank:null,outsideTopTen:true,coverage});
 assert.match(outside,/Aktuell nicht in den Top 10/);assert.match(outside,/Wer wird verglichen/);assert.doesNotMatch(outside,/Dein Platz/);
 const small=render(LeaderboardCard,{pool:0,rank:null,reason:'not-enough-participants'});
 assert.doesNotMatch(small,/Wer wird verglichen|SEC im gewählten Abschluss/);
});
