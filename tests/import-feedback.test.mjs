import assert from 'node:assert/strict';
import test from 'node:test';
import { contextProblems, explainImportFailure, explainImportIssue, mappingProblems, weeklyFields } from '../app/lib/importFeedback.ts';
import { initialMetrics } from '../app/lib/admin.ts';
import { closingMappings, closingTemplate } from '../app/lib/closingImport.ts';
const metrics = initialMetrics('HE', 'full');
const sheet = { name:'Weekly', rows:4, dimension:'A1:K4', columns:['A','B','C','D','E','F','G','H','I','J','K'].map(key=>({key,label:'Quelle '+key})) };
const ctx = {sheet,metrics,mappings:weeklyFields(metrics,'HE',[])};
test('reported missing targets are named in German and lead to editable fields, never row zero/internal keys',()=>{
 for (const metric of metrics) {
  const issue=explainImportIssue({row:0,column:'',message:'Pflichtzuordnung fehlt: '+metric.id+'.target'},ctx);
  assert.match(issue.title,new RegExp(metric.label));assert.match(issue.title,/Monatsziel/);assert.match(issue.solution,/Wähle.*Excel-Spalte/);assert.match(issue.solution,/Excel.*erneut/);
  assert.equal(issue.target,metric.id+'.target');assert.equal(issue.location,undefined);assert.doesNotMatch(JSON.stringify([issue.title,issue.solution]),/\.target|Zeile 0/);
 }
});
test('all divisions and custom metric names have actionable missing fields without inferring targets',()=>{
 for(const group of ['DA','HE','IM','LH','ST'])for(const setting of group==='DA'?['full','laundry-ref','vc']:['full']) {
  const ms=initialMetrics(group,setting);const fields=weeklyFields(ms,group,[]);const issues=mappingProblems({sheet,metrics:ms,mappings:fields},group,false);
  for(const m of ms.filter(m=>m.active))assert.ok(issues.some(i=>i.target===m.id+'.target'));
  assert.ok(fields.every(f=>f.column==='')); // selection is explicit, never fabricated
 }
 const custom=[{...metrics[0],id:'custom',label:'Kundenzufriedenheit'}];
 assert.match(explainImportIssue({row:0,message:'Pflichtzuordnung fehlt: custom.target'},{...ctx,metrics:custom}).title,/Kundenzufriedenheit/);
});
test('duplicate/missing source columns attach to each affected field, valid selections clear them',()=>{
 const maps=weeklyFields(metrics,'HE',[]).map((m,i)=>({...m,column:sheet.columns[i].key}));
 assert.deepEqual(mappingProblems({...ctx,mappings:maps},'HE',false),[]);
 maps[4].column=maps[3].column;
 const issues=mappingProblems({...ctx,mappings:maps},'HE',false);
 assert.ok(issues.some(i=>i.target===maps[3].field&&/mehrfach/.test(i.title)));
 assert.ok(issues.some(i=>i.target===maps[4].field&&/mehrfach/.test(i.title)));
 maps[4].column='ZZ';assert.ok(mappingProblems({...ctx,mappings:maps},'HE',false).some(i=>/gibt es/.test(i.title)));
});
test('closing mapping errors use original labels and optional fields offer deactivation',()=>{
 const s=closingTemplate('HE'),maps=closingMappings(s,'HE');
 const required=maps.find(m=>m.required);required.column='';
 assert.ok(mappingProblems({sheet:s,metrics:[],mappings:maps},'HE',true).some(i=>i.target===required.field&&/Excel-Spalte/.test(i.title)));
 const optional=maps.find(m=>!m.required&&m.dataset!=='ignore');optional.column='';
 assert.ok(mappingProblems({sheet:s,metrics:[],mappings:maps},'HE',true).some(i=>i.target===optional.field&&/deaktiviere/.test(i.solution)));
});
test('cell errors retain exact sheet/cell and provide a repair/reupload sequence',()=>{
 const context={...ctx,mappings:[{...ctx.mappings[3],column:'F'}]};
 for(const msg of ['Excel-Fehler oder Formel ohne gespeicherten Wert.','TV Units: Monatsziel fehlt oder ist ungültig.','TV Units: Istwert nicht lesbar.']){
  const p=explainImportIssue({row:17,column:'F',message:msg},context);
  assert.match(p.location,/Weekly.*F17/);assert.equal(p.target,'units.target');assert.match(p.solution,/Speichere/);assert.match(p.solution,/erneut/);
 }
});
test('period, phase, identity, empty values and request failures lead to the relevant correction',()=>{
 assert.equal(explainImportIssue({row:0,message:'Der gewählte Monat passt nicht zum EDI-Zeitraum der Datei.'},ctx).target,'month');
 assert.equal(explainImportIssue({row:0,message:'Der Datenstand muss dem Ende des EDI-Zeitraums entsprechen.'},ctx).target,'asOf');
 assert.equal(explainImportIssue({row:4,message:'Targetbasis enthält bereits Istwerte. Als Wochenstand importieren.'},ctx).target,'phase');
 assert.equal(explainImportIssue({row:4,message:'Keine eindeutige Person gefunden. Bitte im Dropdown zuordnen.'},ctx).target,'person-row:4');
 assert.match(explainImportFailure('Ungültige Excel-XML-Struktur.').solution,/neue .xlsx-Datei/);
 assert.match(explainImportFailure('Importvorschau ist abgelaufen. Datei erneut wählen.').solution,/erneut/);
 assert.doesNotMatch(explainImportFailure('TypeError: secret internal diagnostics').title,/secret|TypeError/);
 assert.ok(contextProblems('2026-10','2026-11-01','WEEKLY_PROGRESS',sheet,'2026-11-11').some(p=>p.target==='asOf'));
 assert.ok(contextProblems('2026-11','2026-11-31','WEEKLY_PROGRESS',sheet,'2026-11-11').some(p=>p.target==='asOf'));
 assert.ok(contextProblems('2026-11','2026-11-12','WEEKLY_PROGRESS',sheet,'2026-11-11').some(p=>/Zukunft/.test(p.title)));
 assert.deepEqual(contextProblems('2026-11','2026-11-01','WEEKLY_PROGRESS',sheet,'2026-11-11'),[]);
});
