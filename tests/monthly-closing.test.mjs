import assert from 'node:assert/strict';
import test from 'node:test';
import { activeReports, annualClosing, calendarTimeline, closingFixtures, compareClosing, latestReport, nextKPIRelease, newPublications, previousMonth, publicationReadKey } from '../app/lib/monthlyClosing.ts';

test('published fixtures reconcile monthly percentages with applicable metrics in every group', () => {
  for (const group of ['HE','DA','IM','LH','ST']) for (const setting of group === 'DA' ? ['full','laundry-ref','vc'] : ['full']) {
    const reports=closingFixtures(group,setting);
    for (const report of reports) {
      for (const m of report.metrics) assert.ok(Math.abs(m.achievement-m.actual/m.target*100)<.051);
      const weighted=metrics=>Math.round(metrics.reduce((sum,m)=>sum+m.achievement*m.weight,0)/metrics.reduce((sum,m)=>sum+m.weight,0)*10)/10;
      const expected=group==='ST'?null:group==='LH'?Math.round((weighted(report.metrics.filter(m=>m.key.startsWith('he-')))+weighted(report.metrics.filter(m=>m.key.startsWith('im-'))))/2*10)/10:weighted(report.metrics);
      assert.equal(report.sellout,expected);
      assert.equal(report.groupId,group);
    }
    assert.equal(reports.at(-1).metrics.length, group==='IM'?6:group==='LH'?10:group==='DA'&&setting!=='full'?2:4);
    if(group==='ST') for(const r of reports) {assert.equal(r.points,null);assert.equal(r.premium,null);assert.equal(r.tier,'unavailable');assert.equal(r.extras.length,0);}
  }
});
test('annual principal premiums use calendar year, selected cutoff and one active revision',()=>{
  const reports=closingFixtures('HE'); const selected=latestReport(reports); const year=annualClosing(reports,selected);
  assert.equal(year.reports.length,9);assert.equal(year.partial,false);
  assert.equal(year.premium,10305);assert.equal(year.points,year.reports.reduce((n,r)=>n+r.points,0));
  assert.equal(annualClosing([...reports,...reports],selected).premium,10305);
  const old=reports.find(r=>r.month==='2025-12'); assert.equal(annualClosing(reports,old).year,'2025');assert.equal(annualClosing(reports,old).reports.length,1);
  const july=reports.find(r=>r.month==='2026-07');assert.equal(annualClosing(reports,july).reports.length,7);
  assert.ok(year.extras>0);assert.notEqual(year.premium,year.premium+year.extras);
});
test('corrections preserve original revision, replace contribution and keep latest reporting period',()=>{
  for(const scenario of ['correction','old-correction']) {
    const reports=closingFixtures('HE','full',scenario);assert.equal(reports.length,11);assert.equal(activeReports(reports).length,10);
    const latest=latestReport(reports);assert.equal(latest.month,'2026-09');assert.equal(annualClosing(reports,latest).premium,10225);
    const corrected=reports.find(r=>r.revision===2);assert.ok(reports.some(r=>r.reportId===corrected.reportId&&r.revision===1));
    assert.ok(newPublications(reports).some(r=>r.publicationId===corrected.publicationId));
  }
});
test('new month advances latest, while older corrections are independently discoverable',()=>{
  assert.equal(latestReport(closingFixtures('IM','full','new-month')).month,'2026-10');
  assert.equal(newPublications(closingFixtures('IM','full','old-correction')).length,2);
  assert.equal(newPublications(closingFixtures('IM')).length,1);
  assert.equal(latestReport(closingFixtures('IM','full','empty')),null);
  assert.equal(latestReport(closingFixtures('IM','full','lag')).month,'2026-08');
});
test('missing, invalid, real zero and percent-only states do not fabricate prior values',()=>{
  const missing=latestReport(closingFixtures('DA','full','missing')); assert.equal(missing.premium,null);assert.equal(missing.sellout,null);
  assert.equal(missing.metrics[0].resultState,'missing');assert.equal(missing.metrics[1].resultState,'invalid');
  const zero=latestReport(closingFixtures('DA','full','zero')); assert.equal(zero.premium,0);assert.equal(zero.sellout,0);assert.equal(zero.points,1);
  const percent=latestReport(closingFixtures('HE','full','percent-only'));assert.ok(percent.metrics.every(m=>m.actual===null&&m.target===null));assert.equal(percent.sellout,97.7);
  const partial=closingFixtures('DA','full','partial');const year=annualClosing(partial,latestReport(partial));assert.deepEqual(year.missing,['2026-02','2026-05']);assert.equal(year.partial,true);
  const june=partial.find(r=>r.month==='2026-06');assert.equal(compareClosing(june,partial,'sellout'),null);
});
test('month comparisons use adjacent calendar month and version-compatible definitions',()=>{
  const reports=closingFixtures('HE');const current=latestReport(reports);assert.equal(compareClosing(current,reports,'sellout').value,.6);
  assert.equal(previousMonth('2026-01'),'2025-12');
  assert.equal(compareClosing({...current,configurationVersion:'changed'},reports,'sellout'),null);
  assert.notEqual(publicationReadKey('HE','full'),publicationReadKey('DA','full'));
  assert.notEqual(publicationReadKey('DA','full'),publicationReadKey('DA','vc'));
});
test('calendar progress handles month lengths, boundaries and invalid dates independently',()=>{
  for(const day of ['2026-02-28','2028-02-29','2026-04-30','2026-12-31'])assert.equal(calendarTimeline(day).progress,100);
  assert.equal(calendarTimeline('2026-01-01').progress,0);assert.equal(calendarTimeline('2026-10-12').progress,11/30*100);
  for(const day of ['2026-02-29','2026-13-01','garbage','2026-00-03'])assert.equal(calendarTimeline(day),null);
  const report=latestReport(closingFixtures('HE'));const original=JSON.stringify(report);calendarTimeline('2026-11-12');assert.equal(JSON.stringify(report),original);
});
test('KPI calendar counts down to the 15th and waits throughout the 15th–20th window',()=>{
  const october=nextKPIRelease('2026-10-12');
  assert.equal(october.date,'2026-10-15');assert.equal(october.endDate,'2026-10-20');assert.equal(october.daysRemaining,3);assert.equal(october.status,'countdown');assert.equal(october.progress,22/25*100);
  assert.equal(nextKPIRelease('2026-10-14').daysRemaining,1);
  for(const day of [15,16,17,18,19,20]){
    const release=nextKPIRelease('2026-10-'+day);
    assert.equal(release.status,'window');assert.equal(release.date,'2026-10-15');assert.equal(release.daysRemaining,0);assert.equal(release.progress,100);
  }
  const next=nextKPIRelease('2026-10-21');assert.equal(next.status,'countdown');assert.equal(next.date,'2026-11-15');assert.equal(next.daysRemaining,25);assert.equal(next.progress,1/26*100);
  assert.equal(nextKPIRelease('2026-12-31').date,'2027-01-15');assert.equal(nextKPIRelease('2026-12-31').daysRemaining,15);
  assert.equal(nextKPIRelease('2028-02-29').date,'2028-03-15');assert.equal(nextKPIRelease('2028-02-29').daysRemaining,15);
  assert.equal(nextKPIRelease('2026-10-01').daysRemaining,14);assert.equal(nextKPIRelease('2026-02-29'),null);
  const reports=closingFixtures('HE');const before=JSON.stringify(reports);nextKPIRelease('2026-11-12');assert.equal(JSON.stringify(reports),before);
});

test('unknown extra payouts remain unknown while known annual extras and real zero are retained',()=>{
 const reports=closingFixtures('HE').filter(r=>r.month.startsWith('2026'));const selected={...reports.at(-1),extras:[],extrasAvailable:false};
 const annual=annualClosing([...reports.slice(0,-1),selected],selected);assert.equal(annual.extrasPartial,true);assert.equal(annual.partial,true);assert.equal(annual.extras,reports.slice(0,-1).flatMap(r=>r.extras).reduce((n,e)=>n+e.amount,0));
 assert.equal(annualClosing([selected],selected).extras,null);
 const zero={...selected,extras:[{type:'On-top',amount:0}],extrasAvailable:true};assert.equal(annualClosing([zero],zero).extras,0);
});
