import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {personalSoftbonus,visibleSoftbonus} from '../app/lib/personalSoftbonus.ts';
import {closingFixtures} from '../app/lib/monthlyClosing.ts';

const metric=(key,achievement=null,resultState='missing')=>({key,label:key,unit:'%',weight:null,icon:'check',achievement,resultState,actual:null,target:null});
const e4y=[metric('softbonus.samsung-e4y'),metric('softbonus.pos-e4y')];
const kock=['marktzufriedenheit','pos-bewertung','s-activity'].map(k=>metric('softbonus.'+k+'-elektro-k-ck'));

test('blank conditional source blocks are personal nonparticipation, without mutating the closing',()=>{
 for(const [group,block]of [['HE',e4y],['DA',kock]]){
  const input=[metric('softbonus.wissenstest'),...block],before=JSON.stringify(input);
  assert.deepEqual(visibleSoftbonus(input,group),[input[0]]);
  assert(personalSoftbonus(input,group).slice(1).every(m=>m.resultState==='not-applicable'));
  assert.equal(JSON.stringify(input),before);
 }
});
test('real zero proves participation; partial and invalid results remain visible',()=>{
 for(const [group,block]of [['HE',e4y],['DA',kock]]){
  const zero=[{...block[0],achievement:0,resultState:'value'},...block.slice(1)];
  assert.deepEqual(visibleSoftbonus(zero,group),zero);
  const invalid=[{...block[0],resultState:'invalid'},...block.slice(1)];
  assert.deepEqual(visibleSoftbonus(invalid,group),invalid);
  assert.deepEqual(visibleSoftbonus([{...block[0],achievement:94,resultState:'value'}],group).map(m=>m.achievement),[94]);
 }
});
test('general missing criteria, configured criteria and other divisions are never guessed inapplicable',()=>{
 const input=[metric('softbonus.wissenstest'),metric('softbonus.config.custom'),...e4y];
 for(const group of ['IM','LH','ST'])assert.deepEqual(visibleSoftbonus(input,group),input);
 const explicit=[metric('custom',0,'value'),metric('excluded',100,'not-applicable')];
 assert.deepEqual(visibleSoftbonus(explicit,'IM'),[explicit[0]]);
 assert.deepEqual(visibleSoftbonus(personalSoftbonus(input,'HE'),'HE'),visibleSoftbonus(input,'HE'));
});

const url=new URL('../app/components/ClosingMetricExplorer.tsx',import.meta.url);
let js=ts.transpileModule(await readFile(url,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
js=js.replace(/from ["']([^"']+)["']/g,(_all,path)=>'from '+JSON.stringify(path.startsWith('.')?new URL(path+'.ts',url).href:import.meta.resolve(path)));
const {ClosingMetricExplorer}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
function render(metrics){const report=closingFixtures('HE').at(-1);return renderToStaticMarkup(createElement(ClosingMetricExplorer,{title:'Softbonus',note:'Gelieferte Kriterien',metrics,report,reports:[report],kind:'criteria'}));}
test('the actual card counts only applicable criteria and retains an orange real zero and missing general result',()=>{
 const html=render([...e4y,metric('General',0,'value'),metric('Pending'),metric('Explicit NA',null,'not-applicable')]);
 assert.match(html,/2 Kriterien/);assert.match(html,/General: 0%/);assert.match(html,/Pending: Noch kein Wert/);
 assert.doesNotMatch(html,/samsung-e4y|pos-e4y|Explicit NA/);
 assert.match(html,/data-result-state="value" data-threshold-reached="false"/);
});
test('no participation uses an honest empty card without a dead tap hint',()=>{
 const html=render(e4y);assert.match(html,/0 Kriterien/);assert.match(html,/keine zutreffenden Kriterien/);assert.doesNotMatch(html,/antippen|Details anzeigen/);
});
