import assert from 'node:assert/strict';
import test from 'node:test';
import { annualCategory, annualDots, categoryRailPosition, leaderboardState, secLevelTier } from '../app/lib/annual.ts';

test('annual rings share HE geometry and emphasize exactly the last three earned dots', () => {
  for (let points = 0; points <= 36; points++) {
    const dots = annualDots(points);
    assert.equal(dots.length, 36);
    assert.equal(dots.filter(dot => !dot.inactive).length, points);
    assert.equal(dots.filter(dot => dot.current).length, points > 0 ? 1 : 0);
    assert.equal(dots.filter(dot => dot.previous).length, points > 1 ? 1 : 0);
    assert.equal(dots.filter(dot => dot.third).length, points > 2 ? 1 : 0);
    assert.ok(dots.every(dot => !dot.inactive || (!dot.current && !dot.previous && !dot.third)));
    for (let index = 0; index < 36; index++) {
      const next = (index + 1) % 36;
      const separation = 2 * 151 * Math.sin(Math.PI / 36);
      assert.ok((dots[index].size + dots[next].size) / 2 < separation, 'Adjacent dots never overlap');
    }
  }
  const accepted = annualDots(27);
  assert.equal(accepted[9].angle, 130);
  assert.equal(accepted[9].size, 15.2 * 1.3);
  assert.equal(accepted[10].size, 15.2 * 1.07);
  assert.equal(accepted[11].size, 15.2 * 1.03);
  assert.equal(categoryRailPosition(27), 68);
});

test('category thresholds remain SEC 0–20, SEC+ 21–31, SEC Pro 32+', () => {
  assert.equal(annualCategory(20), 'SEC');
  assert.equal(annualCategory(21), 'SEC+');
  assert.equal(annualCategory(31), 'SEC+');
  assert.equal(annualCategory(32), 'SEC Pro');
});

test('SEC history colours follow the level rather than the selected month medal', () => {
  assert.equal(secLevelTier('SEC'), 'bronze');
  assert.equal(secLevelTier('SEC+'), 'silver');
  assert.equal(secLevelTier('SEC Pro'), 'gold');
  for (const unknown of ['', '—', 'Unbekannt']) assert.equal(secLevelTier(unknown), 'unavailable');
});

test('leaderboards suppress pools under ten and never show a place outside the top ten', () => {
  for (const pool of [1, 4, 9]) {
    assert.equal(leaderboardState(pool, 1).visible, false);
    assert.deepEqual(leaderboardState(pool, 1).places, []);
  }
  const boundary = leaderboardState(10, 10);
  assert.equal(boundary.visible, true);
  assert.equal(boundary.ownRank, 10);
  assert.deepEqual(boundary.places, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(leaderboardState(31, 14).ownRank, null);
  assert.equal(leaderboardState(31, 14).outside, true);
  assert.equal(leaderboardState(24, null).outside, false);
  assert.equal(leaderboardState(24, null).ownRank, null);
});
