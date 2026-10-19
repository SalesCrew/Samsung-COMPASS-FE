import assert from 'node:assert/strict';
import test from 'node:test';
import { currentTargets, targetAchievement, targetProgressHistory, weeklyTargetFixtures } from '../app/lib/weeklyTargets.ts';
import { closingFixtures, latestReport } from '../app/lib/monthlyClosing.ts';

test('weekly goals select the current calendar month independently of published closings', () => {
  const source = weeklyTargetFixtures('HE');
  const current = currentTargets(source, 'HE', 'full', '2026-10-12');
  assert.equal(current.month, '2026-10');
  assert.equal(current.asOf, '2026-10-08');
  assert.equal(current.metrics.find(m => m.key === 'units').actual, 21);
  const closing = latestReport(closingFixtures('HE'));
  assert.equal(closing.month, '2026-09');
  assert.equal(closing.metrics.find(m => m.key === 'units').actual, 53);
  const nextMonth = currentTargets(source, 'HE', 'full', '2026-11-12');
  assert.equal(nextMonth.month, '2026-11');
  assert.equal(currentTargets(source.filter(s => s.month === '2026-10'), 'HE', 'full', '2026-11-12'), null);
});

test('latest delivered snapshot replaces cumulative values and respects future delivery dates', () => {
  const base = weeklyTargetFixtures('HE').find(s => s.asOf === '2026-10-08');
  const first = { ...base, updatedAt: '2026-10-08T08:00:00Z', metrics: [{ ...base.metrics[0], actual: 10 }] };
  const corrected = { ...base, updatedAt: '2026-10-10T08:00:00Z', metrics: [{ ...base.metrics[0], actual: 0 }] };
  const future = { ...base, updatedAt: '2026-10-15T08:00:00Z', metrics: [{ ...base.metrics[0], actual: 40 }] };
  assert.equal(currentTargets([future, first, corrected], 'HE', 'full', '2026-10-12').metrics[0].actual, 0);
  assert.equal(currentTargets([first, corrected], 'HE', 'full', '2026-10-09').metrics[0].actual, 10);
  assert.equal(currentTargets([{ ...base, asOf: '2026-10-15' }], 'HE', 'full', '2026-10-12'), null);
});

test('target basis has no invented actuals and unavailable or invalid dates stay empty', () => {
  const source = weeklyTargetFixtures('HE');
  const basis = currentTargets(source, 'HE', 'full', '2026-10-01');
  assert.ok(basis.metrics.every(metric => metric.actual === null && metric.target !== null));
  assert.equal(currentTargets([], 'HE', 'full', '2026-10-12'), null);
  assert.equal(currentTargets(source, 'HE', 'full', '2026-02-30'), null);
  const invalid = [{ ...source[1], asOf: '2026-10-32' }, { ...source[1], updatedAt: 'invalid' }, { ...source[1], asOf: '2026-09-30' }];
  assert.equal(currentTargets(invalid, 'HE', 'full', '2026-10-12'), null);
});

test('group and DA assignment boundaries keep 4/2/2 goals and LH HE/IM separate', () => {
  const source = ['full', 'laundry-ref', 'vc'].flatMap(setting => weeklyTargetFixtures('DA', setting));
  for (const [setting, keys] of [['full', ['laundry','ref','vc-stick','vc-premium']], ['laundry-ref', ['laundry','ref']], ['vc', ['vc-stick','vc-premium']]]) {
    assert.deepEqual(currentTargets(source, 'DA', setting, '2026-10-12').metrics.map(m => m.key), keys);
  }
  assert.equal(currentTargets(source, 'HE', 'full', '2026-10-12'), null);
  const lh = currentTargets(weeklyTargetFixtures('LH'), 'LH', 'full', '2026-10-12');
  assert.equal(lh.metrics.filter(m => m.key.startsWith('he-')).length, 4);
  assert.equal(lh.metrics.filter(m => m.key.startsWith('im-')).length, 6);
});

test('ST goals do not invent a weekly qualitative result or any money or rank', () => {
  const st = currentTargets(weeklyTargetFixtures('ST'), 'ST', 'full', '2026-10-12');
  assert.equal(st.metrics.length, 4);
  assert.ok(st.metrics.every(m => m.unit === '%' && m.actual === null));
  for (const key of ['premium','points','rank','sellout']) assert.equal(key in st, false);
});

test('weekly detail contains dated cumulative values, keeps missing basis and excludes future deliveries', () => {
  const history = targetProgressHistory(weeklyTargetFixtures('HE'), 'HE', 'full', '2026-10-12', 'units');
  assert.deepEqual(history.map(s => s.asOf), ['2026-10-01','2026-10-04','2026-10-08']);
  assert.deepEqual(history.map(s => s.actual), [null,11,21]);
  assert.deepEqual(history.map(s => s.achievement), [null,22,42]);
  assert.deepEqual(history.map(s => s.change), [null,null,10]);
  assert.deepEqual(history.map(s => s.previousAsOf), [null,'2026-10-01','2026-10-04']);
  assert.equal(history.at(-1).actual,21);
  assert.equal(history[1].updatedAt.slice(0,10),'2026-10-05');
  assert.equal(targetProgressHistory(weeklyTargetFixtures('DA','vc'), 'DA', 'laundry-ref', '2026-10-12', 'vc-stick').length,0);
  assert.equal(targetProgressHistory(weeklyTargetFixtures('HE'), 'HE', 'full', '2026-10-12', 'unknown').length,0);
});

test('weekly corrections replace their dated history row without adding duplicate points', () => {
  const source = weeklyTargetFixtures('HE');
  const old = source.find(s => s.asOf === '2026-10-04');
  const correction = {...old, id:'corrected', updatedAt:'2026-10-10T08:00:00Z', metrics:old.metrics.map(m => m.key === 'units' ? {...m,actual:0,target:55} : m)};
  const history = targetProgressHistory([...source,correction], 'HE', 'full', '2026-10-12', 'units');
  assert.equal(history.length,3);assert.equal(history[1].actual,0);assert.equal(history[1].target,55);assert.equal(history[1].achievement,0);assert.equal(history[2].actual,21);
  assert.equal(history[2].change,21);
  assert.ok(targetProgressHistory(weeklyTargetFixtures('ST'), 'ST', 'full', '2026-10-12', 'pos').every(s => s.achievement === null));
  for(const [actual,target] of [[null,50],[10,null],[10,0],[10,Infinity],[NaN,50],[-1,50]])assert.equal(targetAchievement(actual,target),null);
  assert.equal(targetAchievement(0,50),0);assert.equal(targetAchievement(45,50),90);assert.equal(targetAchievement(53,50),106);
});

test('weekly changes compare adjacent actuals, including zero, declines and target corrections', () => {
  const source = weeklyTargetFixtures('HE').filter(s => s.month === '2026-10');
  const actuals = [0,12,8,8];
  const stands = source.map((s,index) => ({...s,metrics:s.metrics.map(m => m.key === 'units' ? {...m,actual:actuals[index],target:index === 3 ? 10 : m.target} : m)}));
  const history = targetProgressHistory(stands,'HE','full','2026-10-17','units');
  assert.deepEqual(history.map(s => s.change),[null,12,-4,0]);
  assert.equal(history.at(-1).achievement,80);
  const missing = stands.map((s,index) => index === 1 ? {...s,metrics:s.metrics.map(m => m.key === 'units' ? {...m,actual:null} : m)} : s);
  assert.deepEqual(targetProgressHistory(missing,'HE','full','2026-10-17','units').map(s => s.change),[null,null,null,0]);
  for (const actual of [NaN,Infinity,-1]) {
    const invalid = stands.map((s,index) => index === 1 ? {...s,metrics:s.metrics.map(m => m.key === 'units' ? {...m,actual} : m)} : s);
    assert.deepEqual(targetProgressHistory(invalid,'HE','full','2026-10-17','units').map(s => s.change),[null,null,null,0]);
  }
  const nextMonth = targetProgressHistory(weeklyTargetFixtures('HE'),'HE','full','2026-11-12','units');
  assert.deepEqual(nextMonth.map(s => s.change),[null,null,10]);
  assert.ok(targetProgressHistory(weeklyTargetFixtures('ST'),'ST','full','2026-10-17','pos').every(s => s.change === null));
});

test('older corrections do not rewind the newest dated stand and changes stop at missing or incompatible definitions',()=>{
 const base=weeklyTargetFixtures('HE').find(s=>s.asOf==='2026-10-08');
 const early={...base,asOf:'2026-10-04',updatedAt:'2026-10-12T08:00:00Z'};
 assert.equal(currentTargets([base,early],'HE','full','2026-10-12').asOf,'2026-10-08');
 const gap={...base,asOf:'2026-10-06',metrics:base.metrics.filter(m=>m.key!=='units')};
 assert.equal(targetProgressHistory([early,gap,base],'HE','full','2026-10-12','units').at(-1).change,null);
 const changed={...base,metrics:base.metrics.map(m=>({...m,unit:'€'}))};
 assert.equal(targetProgressHistory([early,changed],'HE','full','2026-10-12','units').at(-1).change,null);
});
test('explicit historical test replay keeps upload date visible and limits snapshots to the tested day',()=>{
 const old=weeklyTargetFixtures('HE').find(s=>s.asOf==='2026-10-08');
 const delayed={...old,updatedAt:'2026-11-19T10:00:00Z'};
 assert.equal(currentTargets([delayed],'HE','full','2026-10-12'),null);
 const replay={...delayed,replayAvailableOn:old.asOf};
 assert.equal(currentTargets([replay],'HE','full','2026-10-12').updatedAt,delayed.updatedAt);
 assert.equal(currentTargets([replay],'HE','full','2026-10-07'),null);
});
