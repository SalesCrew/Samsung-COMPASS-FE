import assert from 'node:assert/strict';
import test from 'node:test';
import { softbonusDots, softbonusGap } from '../app/lib/softbonus.ts';

test('ST progress uses percent markers, including partial progress, not annual points', () => {
  for (const value of [0, 1, 48, 92, 93, 94, 94.5, 100, 110]) {
    const dots = softbonusDots(value);
    assert.equal(dots.length, 50);
    assert.ok(Math.abs(dots.reduce((sum, dot) => sum + dot.fill, 0) * 2 - Math.min(100, value)) < .00001);
    assert.equal(dots.filter(dot => dot.current).length, value > 0 ? 1 : 0);
    assert.ok(dots.every(dot => dot.fill >= 0 && dot.fill <= 1));
    const separation = 2 * 151 * Math.sin(Math.PI / 50);
    for (let index = 0; index < dots.length; index++) assert.ok((dots[index].size + dots[(index + 1) % dots.length].size) / 2 < separation);
  }
  assert.equal(softbonusDots(94).filter(dot => dot.fill === 1).length, 47);
  assert.equal(softbonusDots(94).filter(dot => dot.fill === 0).length, 3);
  assert.equal(softbonusDots(null).filter(dot => dot.fill > 0).length, 0);
  assert.equal(softbonusDots(NaN).filter(dot => dot.current).length, 0);
});

test('ST remaining target copy keeps missing and achieved states distinct', () => {
  assert.equal(softbonusGap(94), '6% bis Ziel');
  assert.equal(softbonusGap(100), 'Ziel erreicht');
  assert.equal(softbonusGap(110), 'Ziel erreicht');
  assert.equal(softbonusGap(null), 'Noch kein Iststand');
});
