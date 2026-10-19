import assert from 'node:assert/strict';
import test from 'node:test';
import { categoryNodePosition, categoryRoadmapPaths, categoryTrackWidth } from '../app/lib/categoryRoadmap.ts';

test('shared roadmap rises, stays level, and falls with the real category', () => {
  const entries = [{ category: 'SEC' }, { category: 'SEC+' }, { category: 'SEC+' }, { category: 'SEC' }];
  const positions = entries.map((entry, index) => categoryNodePosition(index, entries.length, entry.category));
  assert.deepEqual(positions.map(item => item.top), [94, 43, 43, 94]);
  assert.ok(positions.every((item, index) => index === 0 || item.left > positions[index - 1].left));
  const paths = categoryRoadmapPaths(entries);
  assert.equal(paths.length, 3);
  assert.match(paths[0], / V /, 'Upward category transition has a vertical connector');
  assert.doesNotMatch(paths[1], / V /, 'Unchanged category has a flat connector');
  assert.match(paths[2], / V /, 'Downward category transition has a vertical connector');
});

test('shorter filtered histories keep their roadmap instead of losing connecting lines', () => {
  assert.equal(categoryRoadmapPaths([{ category: 'SEC+' }]).length, 0);
  assert.equal(categoryRoadmapPaths([{ category: 'SEC+' }, { category: 'SEC Pro' }]).length, 1);
  assert.equal(categoryRoadmapPaths([{ category: 'SEC' }, { category: 'SEC+' }, { category: 'SEC Pro' }]).length, 2);
  assert.equal(categoryNodePosition(0, 1, 'SEC').left, (473 - 82) / 2);
});

test('connectors and circles share coordinates in wide cards and scrolling tracks', () => {
  for (const count of [2, 4, 10]) {
    const entries = Array.from({length: count}, () => ({category: 'SEC'}));
    const width = categoryTrackWidth(count, 752);
    const nodes = entries.map((entry, index) => categoryNodePosition(index, count, entry.category, width));
    categoryRoadmapPaths(entries, width).forEach((path, index) => {
      assert.equal(path, `M ${nodes[index].left + 82} ${nodes[index].top + 41} H ${nodes[index + 1].left}`);
    });
    assert.ok(nodes[0].left >= 27);
    assert.ok(nodes.at(-1).left + 82 <= width - 27);
  }
  assert.ok(categoryTrackWidth(10, 752) > 752, 'Existing demo months provide a horizontally scrollable history');
});

test('short histories remain centered without artificial spacing and unknown levels break the route', () => {
  const width = categoryTrackWidth(2, 752);
  const first = categoryNodePosition(0, 2, 'SEC', width);
  const second = categoryNodePosition(1, 2, 'SEC+', width);
  assert.equal(second.left - first.left, 128);
  assert.equal(first.left, width - second.left - 82);
  assert.equal(categoryNodePosition(0, 1, 'SEC', 752).left, (752 - 82) / 2);
  assert.deepEqual(categoryRoadmapPaths([{category:'SEC'}, {category:'—'}, {category:'SEC+'}], 752), ['', '']);
});
