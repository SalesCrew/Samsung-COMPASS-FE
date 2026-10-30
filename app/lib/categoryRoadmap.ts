export type RoadmapEntry = { category: string };

/** Start at the first known level; retain later gaps instead of inventing continuity. */
export function visibleCategoryHistory<T extends RoadmapEntry>(entries:readonly T[]):readonly T[]{
  const start=entries.findIndex(entry=>['SEC','SEC+','SEC Pro'].includes(entry.category));
  return start<0?[]:entries.slice(start);
}

const CARD_WIDTH = 473;
export const CATEGORY_ROADMAP = { nodeSize:82, pitch:128, edge:27, height:190, proTop:19, plusTop:43, baseTop:94 };
// Native typography is larger than a half-size artboard label; reserve enough room for both lines.
export const NATIVE_CATEGORY_ROADMAP = { nodeSize:112, pitch:152, edge:28, height:236, proTop:20, plusTop:64, baseTop:108 };
type RoadmapGeometry = typeof CATEGORY_ROADMAP;

export function categoryTrackWidth(count: number, viewportWidth = CARD_WIDTH, geometry:RoadmapGeometry = CATEGORY_ROADMAP) {
  return Math.max(viewportWidth, geometry.edge * 2 + geometry.nodeSize + Math.max(0, count - 1) * geometry.pitch);
}

export function categoryNodePosition(index: number, count: number, category: string, width?:number, geometry:RoadmapGeometry = CATEGORY_ROADMAP) {
  const contentWidth = geometry.nodeSize + Math.max(0, count - 1) * geometry.pitch;
  const left = ((width??categoryTrackWidth(count,CARD_WIDTH,geometry)) - contentWidth) / 2 + index * geometry.pitch;
  const top = category === 'SEC Pro' ? geometry.proTop : category === 'SEC+' ? geometry.plusTop : geometry.baseTop;
  return { left, top };
}

export function categoryRoadmapPaths(entries: readonly RoadmapEntry[], width?:number, geometry:RoadmapGeometry = CATEGORY_ROADMAP) {
  const trackWidth=width??categoryTrackWidth(entries.length,CARD_WIDTH,geometry);
  return entries.slice(0, -1).map((entry, index) => {
    if (entry.category === '—' || entries[index + 1].category === '—') return '';
    const from = categoryNodePosition(index, entries.length, entry.category, trackWidth,geometry);
    const to = categoryNodePosition(index + 1, entries.length, entries[index + 1].category, trackWidth,geometry);
    const fromX = from.left + geometry.nodeSize;
    const toX = to.left;
    const fromY = from.top + geometry.nodeSize / 2;
    const toY = to.top + geometry.nodeSize / 2;
    if (fromY === toY) return `M ${fromX} ${fromY} H ${toX}`;
    const middle = (fromX + toX) / 2;
    const direction = Math.sign(toY - fromY);
    const radius = Math.min(7, Math.abs(toY - fromY) / 3, (toX - fromX) / 4);
    return `M ${fromX} ${fromY} H ${middle - radius} Q ${middle} ${fromY} ${middle} ${fromY + direction * radius} V ${toY - direction * radius} Q ${middle} ${toY} ${middle + radius} ${toY} H ${toX}`;
  });
}
