'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { activeDashboardSection, SECTION_ANCHORS, type DashboardSection } from '../lib/dashboard';

export function useDashboardNavigation(groupId: string, pageScroll = false) {
  const scrollRegionRef = useRef<HTMLDivElement>(null);
  const animation = useRef<number | null>(null);
  const [activeSection, setActiveSection] = useState<DashboardSection>('home');
  const cancelNavigation = useCallback(() => {
    if (animation.current !== null) cancelAnimationFrame(animation.current);
    animation.current = null;
  }, []);
  const targetTop = useCallback((region: HTMLElement, element: HTMLElement | null, offset: number) => {
    if (!element) return 0;
    if (pageScroll) return Math.max(0, element.getBoundingClientRect().top + window.scrollY - 76);
    let top = 0;
    for (let node: HTMLElement | null = element; node && !node.classList.contains('phone-scroll-content'); node = node.offsetParent as HTMLElement | null) top += node.offsetTop;
    return Math.max(0, top - offset);
  }, [pageScroll]);
  useEffect(() => {
    const region = scrollRegionRef.current;
    if (!region) return;
    const scroller = pageScroll ? window : region;
    let frame = 0;
    const update = () => {
      frame = 0;
      const destinations = SECTION_ANCHORS.map(anchor => ({key: anchor.key, top: targetTop(region, region.querySelector<HTMLElement>(`#${groupId}-${anchor.id}`), anchor.offset)})).sort((a, b) => a.top - b.top);
      setActiveSection(activeDashboardSection(pageScroll ? window.scrollY : region.scrollTop, destinations));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const onKey = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) cancelNavigation();
    };
    update();
    scroller.addEventListener('scroll', onScroll, {passive:true});
    scroller.addEventListener('wheel', cancelNavigation, {passive:true});
    scroller.addEventListener('pointerdown', cancelNavigation, {passive:true});
    scroller.addEventListener('touchstart', cancelNavigation, {passive:true});
    scroller.addEventListener('keydown', onKey as EventListener);
    window.addEventListener('resize', onScroll);
    const observer = new ResizeObserver(onScroll);
    if (region.firstElementChild) observer.observe(region.firstElementChild);
    return () => {
      cancelNavigation();
      if (frame) cancelAnimationFrame(frame);
      scroller.removeEventListener('scroll', onScroll);
      scroller.removeEventListener('wheel', cancelNavigation);
      scroller.removeEventListener('pointerdown', cancelNavigation);
      scroller.removeEventListener('touchstart', cancelNavigation);
      scroller.removeEventListener('keydown', onKey as EventListener);
      window.removeEventListener('resize', onScroll);
      observer.disconnect();
    };
  }, [groupId, pageScroll, targetTop, cancelNavigation]);
  const scrollToSection = useCallback((section: DashboardSection, onArrive?: () => void, options?: {instant?:boolean;focus?:boolean}) => {
    const region = scrollRegionRef.current;
    const anchor = SECTION_ANCHORS.find(item => item.key === section);
    const target = anchor && region?.querySelector<HTMLElement>(`#${groupId}-${anchor.id}`);
    if (!region || !anchor || !target) return;
    cancelNavigation();
    const max = pageScroll ? document.documentElement.scrollHeight - window.innerHeight : region.scrollHeight - region.clientHeight;
    const destination = Math.max(0, Math.min(max, targetTop(region, target, anchor.offset)));
    const start = pageScroll ? window.scrollY : region.scrollTop;
    const move = (top:number) => { if(pageScroll)window.scrollTo({top,behavior:'instant'});else region.scrollTop=top; };
    const arrived = () => { if(options?.focus)target.focus({preventScroll:true});onArrive?.(); };
    if(options?.instant || window.matchMedia('(prefers-reduced-motion: reduce)').matches){move(destination);arrived();return;}
    const started=performance.now();
    const step=(now:number)=>{
      const progress=Math.min(1,(now-started)/480);
      move(start+(destination-start)*(1-(1-progress)**3));
      if(progress<1)animation.current=requestAnimationFrame(step);
      else{animation.current=null;arrived();}
    };
    animation.current=requestAnimationFrame(step);
  }, [groupId, pageScroll, targetTop, cancelNavigation]);
  return {scrollRegionRef,activeSection,scrollToSection,cancelNavigation};
}
