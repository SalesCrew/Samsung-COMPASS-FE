'use client';

import { useEffect, useRef } from 'react';

/** Preview sheets stay in their device; live sheets lock the page behind them. */
export function usePhoneDialog(onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const native=!!panel?.closest('.fieldforce-dashboard');
    const previousOverflow=document.body.style.overflow;
    const outside=native?Array.from(document.querySelectorAll<HTMLElement>('.is-fieldforce > .sec-account-bar, .is-fieldforce > .sec-notice-banner, .sec-personal-context, .sec-test-period')):[];
    const previousInert=outside.map(element=>element.inert);
    if(native){document.body.style.overflow='hidden';outside.forEach(element=>{element.inert=true;});}
    panel?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      // Escape first dismisses an expanded choice list, then the containing sheet.
      if (event.key === 'Escape' && panel?.querySelector('[role="combobox"][aria-expanded="true"]')) return;
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]'));
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if(native){document.body.style.overflow=previousOverflow;outside.forEach((element,index)=>{element.inert=previousInert[index];});} previous?.focus({ preventScroll: true }); };
  }, []);
  return panelRef;
}
