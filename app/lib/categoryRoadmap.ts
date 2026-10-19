export type RoadmapEntry = { category: string };

const CARD_WIDTH = 473;
const NODE_SIZE = 82;
const NODE_PITCH = 128;
const EDGE_SPACE = 27;

export function categoryTrackWidth(count: number, viewportWidth = CARD_WIDTH) {
  return Math.max(viewportWidth, EDGE_SPACE * 2 + NODE_SIZE + Math.max(0, count - 1) * NODE_PITCH);
}

export function categoryNodePosition(index: number, count: number, category: string, width = categoryTrackWidth(count)) {
  const contentWidth = NODE_SIZE + Math.max(0, count - 1) * NODE_PITCH;
  const left = (width - contentWidth) / 2 + index * NODE_PITCH;
  const top = category === 'SEC Pro' ? 19 : category === 'SEC+' ? 43 : 94;
  return { left, top };
}

export function categoryRoadmapPaths(entries: readonly RoadmapEntry[], width = categoryTrackWidth(entries.length)) {
  return entries.slice(0, -1).map((entry, index) => {
    if (entry.category === '—' || entries[index + 1].category === '—') return '';
    const from = categoryNodePosition(index, entries.length, entry.category, width);
    const to = categoryNodePosition(index + 1, entries.length, entries[index + 1].category, width);
    const fromX = from.left + NODE_SIZE;
    const toX = to.left;
    const fromY = from.top + NODE_SIZE / 2;
    const toY = to.top + NODE_SIZE / 2;
    if (fromY === toY) return `M ${fromX} ${fromY} H ${toX}`;
    const middle = (fromX + toX) / 2;
    const direction = Math.sign(toY - fromY);
    const radius = Math.min(7, Math.abs(toY - fromY) / 3, (toX - fromX) / 4);
    return `M ${fromX} ${fromY} H ${middle - radius} Q ${middle} ${fromY} ${middle} ${fromY + direction * radius} V ${toY - direction * radius} Q ${middle} ${toY} ${middle + radius} ${toY} H ${toX}`;
  });
}
