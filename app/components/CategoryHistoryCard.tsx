'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CATEGORY_ROADMAP, NATIVE_CATEGORY_ROADMAP, categoryNodePosition, categoryRoadmapPaths, categoryTrackWidth } from '../lib/categoryRoadmap';
import { type PerformanceTier } from '../lib/groups';
import { secLevelTier } from '../lib/annual';

export type CategoryEntry = { id: string; short: string; category: string; label?: string; tier?:PerformanceTier };

export function CategoryHistoryCard({ groupId, entries, flow = false, anchor = true, native = false }: {
  groupId: string; entries: readonly CategoryEntry[]; flow?: boolean; anchor?: boolean; native?: boolean;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const lastShown = useRef<string | null>(null);
  const followLatest = useRef(true);
  const [viewportWidth, setViewportWidth] = useState(473);
  const [edges, setEdges] = useState({ older: false, newer: false });
  const scale=native ? 0.5 : 1;
  const geometry=native?NATIVE_CATEGORY_ROADMAP:CATEGORY_ROADMAP;
  const single=native&&entries.length===1;
  const trackHeight=single?geometry.nodeSize+geometry.edge*2:geometry.height;
  const trackWidth = categoryTrackWidth(entries.length, viewportWidth/scale,geometry);
  const nativeStyle=native?{'--category-node-size':geometry.nodeSize*scale+'px','--category-track-height':trackHeight*scale+'px'} as CSSProperties:undefined;
  const latestId = entries.at(-1)?.id ?? '';
  const hasEntries = entries.length > 0;
  const updateEdges = useCallback(() => {
    const el = viewport.current;
    if (!el) return;
    const older = el.scrollLeft > 1;
    const newer = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setEdges(previous => previous.older === older && previous.newer === newer ? previous : { older, newer });
  }, []);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const measure = () => { setViewportWidth(el.clientWidth); updateEdges(); };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasEntries, updateEdges]);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    if (lastShown.current !== latestId || followLatest.current) {
      el.scrollLeft = el.scrollWidth;
      lastShown.current = latestId;
      followLatest.current = true;
    }
    updateEdges();
  }, [latestId, trackWidth, viewportWidth, updateEdges]);
  function move(direction: number) {
    const el = viewport.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * .65, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  return <section className={`ui-card category-card${flow ? ' overview-flow-card' : ''}${entries.length===1?' is-single-history':''}`} style={nativeStyle} id={anchor ? `${groupId}-section-category` : undefined} aria-label="Kategorieverlauf">
    <header className="category-history-heading"><h3>SEC-Level-Verlauf</h3>{hasEntries&&(edges.older||edges.newer)&&<div>
      <button type="button" aria-label="Ältere SEC-Level anzeigen" disabled={!hasEntries || !edges.older} onClick={() => move(-1)}><ChevronLeft size={23}/></button>
      <button type="button" aria-label="Neuere SEC-Level anzeigen" disabled={!hasEntries || !edges.newer} onClick={() => move(1)}><ChevronRight size={23}/></button>
    </div>}</header>
    {entries.length ? <div className="category-history-scroll" ref={viewport} onScroll={event => { const el = event.currentTarget; followLatest.current = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1; updateEdges(); }} tabIndex={0} role="region" aria-label="SEC-Level-Verlauf, links und rechts scrollbar" onKeyDown={event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1); }
      if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); event.currentTarget.scrollLeft = event.key === 'Home' ? 0 : event.currentTarget.scrollWidth; }
    }}>
      <div className="category-history-track" style={{width: trackWidth*scale}} role="list" aria-label="Monatliche SEC-Level">
        <svg className="category-route" viewBox={`0 0 ${trackWidth} ${trackHeight}`} preserveAspectRatio="none" aria-hidden="true">{categoryRoadmapPaths(entries, trackWidth,geometry).map((path, index) => <path key={entries[index].id} d={path}/>)}</svg>
        {entries.map((entry, index) => <div key={entry.id} className={`category-node tier-${secLevelTier(entry.category)}${index === entries.length - 1 ? ' is-latest' : ''}`} style={(()=>{const position=categoryNodePosition(index,entries.length,entry.category,trackWidth,geometry);return{left:position.left*scale,top:(single?geometry.edge:position.top)*scale};})()} role="listitem" aria-label={`${entry.label ?? entry.short}: ${entry.category === '—' ? 'Level noch nicht verfügbar' : entry.category}`}><small>{entry.short}</small><strong>{entry.category}</strong></div>)}
      </div>
    </div> : <p className="category-empty">Kein Kategoriestand im Zeitraum</p>}
  </section>;
}
