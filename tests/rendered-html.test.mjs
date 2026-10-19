import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
async function render() {
 return fetch((process.env.SEC_TEST_URL??'http://127.0.0.1:4319')+'/preview');
}
test('server-rendered monthly Fieldforce flow has coherent periods and complete group variants',async()=>{
 const response=await render();assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/^text\/html/i);
 const html=(await response.text()).replace(/<!-- -->/g,'');
 assert.equal((html.match(/data-testid="sec-phone"/g)??[]).length,5);
 assert.equal((html.match(/>Letzter Monat<\/h1>/g)??[]).length,5);
 assert.equal((html.match(/class="configured-card kpi-release-card"/g)??[]).length,5);
 assert.equal((html.match(/class="configured-card annual-premium-card"/g)??[]).length,4);
 assert.match(html,/Erwartet 15.–20. Oktober 2026/);assert.doesNotMatch(html,/jeden 1. des Monats|Vorläufig|nächstes Update KW|Noch 4 bis Ziel|Größter Hebel|Gesamt 2026/);
 const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
 for(const group of ['HE','DA','IM','LH','ST']){
  const begin=html.indexOf('data-group="'+group+'"');const end=html.indexOf('data-testid="sec-phone"',begin+1);const phone=html.slice(begin,end===-1?undefined:end);
  for(const section of ['home','trend','monthly','category','targets'])assert.ok(ids.includes(group+'-section-'+section));
  assert.match(phone,/Monatliche Ziele Oktober 2026 anzeigen/);
  assert.match(phone,/aria-controls="[A-Z]+-section-targets"/);
  const targets=phone.slice(phone.indexOf('class="configured-card current-targets"'),phone.indexOf('</section>',phone.indexOf('class="configured-card current-targets"')));
  assert.match(targets,/data-target-month="2026-10"/);assert.match(targets,/Oktober 2026/);assert.match(targets,/08\.10\.2026/);assert.match(targets,/Letzte Aktualisierung/);assert.doesNotMatch(targets,/September 2026|Monatsprämie|Jahrespunkte/);
  assert.equal((targets.match(/data-target-metric=/g)??[]).length,{HE:4,DA:4,IM:6,LH:10,ST:4}[group]);
  assert.match(targets,/Wochenverlauf anzeigen/);assert.match(targets,/data-target-view="overview"/);
  assert.ok(phone.indexOf('monthly-report-summary')<phone.indexOf('monthly-premium-card'));
  assert.ok(phone.indexOf('kpi-release-card')<phone.indexOf('monthly-report-summary'));
  assert.ok(phone.indexOf('monthly-premium-card')<phone.indexOf('monthly-annual-section'));
  assert.ok(phone.indexOf('monthly-annual-section')<phone.indexOf('configured-month-section'));
  assert.match(phone,/Neu: September 2026 ist verfügbar/);
  assert.match(phone,/Neue KPIs in/);assert.match(phone,/3 Tagen/);
  const report=phone.match(/data-report="([^"]+)"/)?.[1];assert.ok(report);assert.ok(phone.includes('data-premium-report="'+report+'"'));
  if(group==='ST'){assert.doesNotMatch(phone,/points-card|leaderboard-card|annual-premium-card|Sales Race|Sell-out/);assert.match(phone,/Prämienmodell noch nicht bestätigt/);assert.match(phone,/94 Prozent Softbonus/);}
  if(group==='LH'){assert.doesNotMatch(phone,/leaderboard-card/);assert.equal((phone.match(/data-metric="/g)??[]).length,14);}
  if(group==='IM')assert.equal((phone.match(/data-metric="/g)??[]).length,9);
  if(group==='DA')assert.equal((phone.match(/data-metric="/g)??[]).length,7);
  if(group==='HE')assert.equal((phone.match(/data-metric="/g)??[]).length,7);
  assert.match(phone,/data-metric-view="overview"/);assert.match(phone,/Details anzeigen/);
 }
 assert.match(html,/23 von 36 Jahrespunkten/);assert.match(html,/Leaderboard Position 7 von 24/);
 assert.doesNotMatch(html,/data-rank="(?:11|14)"/);assert.match(html,/Nur Top 10 wird angezeigt/);
 assert.doesNotMatch(html,/kpi-constellation-card|target-liquid-wave|lever-card/);
 assert.match(html,/Design tokens/);assert.doesNotMatch(html,/codex-preview|react-loading-skeleton/);
});
test('theme and shared interactive metrics use natural flow',async()=>{
 const [workbench,styles,metrics]=await Promise.all([
  readFile(new URL('../app/components/SECWorkbench.tsx',import.meta.url),'utf8'),
  readFile(new URL('../app/globals.css',import.meta.url),'utf8'),
  readFile(new URL('../app/components/ClosingMetricExplorer.tsx',import.meta.url),'utf8')]);
 assert.match(workbench,/sec-dashboard-theme\/v1/);assert.match(workbench,/soft-continuous-corners-v3/);
 for(const [key,value] of [['canvas','#F5F9FF'],['blue','#0651BB'],['green','#04B87A']])assert.ok(workbench.includes(key+': "'+value+'"'));
 for(const corner of ['card: 42','nested: 36','dock: 64'])assert.ok(workbench.includes(corner));
 assert.match(styles,/\.header-actions \{[\s\S]*?position: sticky;[\s\S]*?top: 88px/);
 assert.doesNotMatch(styles,/height: (?:3392|4520)px/);
 assert.match(metrics,/closing-metric-back/);assert.match(styles,/superellipse\(1\.5\)/);
});
