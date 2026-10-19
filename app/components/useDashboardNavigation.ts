'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { activeDashboardSection, SECTION_ANCHORS, type DashboardSection } from '../lib/dashboard';

export function useDashboardNavigation(groupId: string) {
  const scrollRegionRef = useRef<HTMLDivElement>(null);
  const animation = useRef<number | null>(null);
  const [activeSection, setActiveSection] = useState<DashboardSection>('home');

  const cancelNavigation = useCallback(() => {
    if (animation.current !== null) cancelAnimationFrame(animation.current);
    animation.current = null;
  }, []);

  useEffect(() => {
    const region = scrollRegionRef.current;
    if (!region) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const destinations = SECTION_ANCHORS.map(anchor => ({
        key: anchor.key,
        top: Math.max(0, getTop(region.querySelector<HTMLElement>(`#${groupId}-${anchor.id}`)) - anchor.offset),
      })).sort((a, b) => a.top - b.top);
      setActiveSection(activeDashboardSection(region.scrollTop, destinations));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const onKey = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) cancelNavigation();
    };
    update();
    region.addEventListener('scroll', onScroll, { passive: true });
    region.addEventListener('wheel', cancelNavigation, { passive: true });
    region.addEventListener('pointerdown', cancelNavigation, { passive: true });
    region.addEventListener('touchstart', cancelNavigation, { passive: true });
    region.addEventListener('keydown', onKey);
    const observer = new ResizeObserver(onScroll);
    if (region.firstElementChild) observer.observe(region.firstElementChild);
    return () => {
      cancelNavigation();
      if (frame) cancelAnimationFrame(frame);
      region.removeEventListener('scroll', onScroll);
      region.removeEventListener('wheel', cancelNavigation);
      region.removeEventListener('pointerdown', cancelNavigation);
      region.removeEventListener('touchstart', cancelNavigation);
      region.removeEventListener('keydown', onKey);
      observer.disconnect();
    };
  }, [groupId, cancelNavigation]);

  const scrollToSection = useCallback((section: DashboardSection, onArrive?: () => void, options?: { instant?: boolean; focus?: boolean }) => {
    const region = scrollRegionRef.current;
    const anchor = SECTION_ANCHORS.find(item => item.key === section);
    const target = anchor && region?.querySelector<HTMLElement>(`#${groupId}-${anchor.id}`);
    if (!region || !anchor || !target) return;
    cancelNavigation();
    const destination = Math.max(0, Math.min(region.scrollHeight - region.clientHeight, getTop(target) - anchor.offset));
    const start = region.scrollTop;
    const arrived = () => { if (options?.focus) target.focus({ preventScroll: true }); onArrive?.(); };
    if (options?.instant || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      region.scrollTop = destination;
      arrived();
      return;
    }
    const started = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / 480);
      const eased = 1 - (1 - progress) ** 3;
      region.scrollTop = start + (destination - start) * eased;
      if (progress < 1) animation.current = requestAnimationFrame(step);
      else { region.scrollTop = destination; animation.current = null; arrived(); }
    };
    animation.current = requestAnimationFrame(step);
  }, [groupId, cancelNavigation]);
  return { scrollRegionRef, activeSection, scrollToSection, cancelNavigation };
}

// Offset parents can differ in the variable-height group layouts. Accumulate
// offsets only up to this phone's content, never to another phone or the page.
function getTop(element: HTMLElement | null) {
  let top = 0;
  for (let node = element; node && !node.classList.contains('phone-scroll-content'); node = node.offsetParent as HTMLElement | null) top += node.offsetTop;
  return top;
}
