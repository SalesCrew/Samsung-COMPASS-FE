'use client';

import { useEffect, useRef, useState } from 'react';
import { LogOut, UserRound } from 'lucide-react';

export function FieldforceAccountMenu({ name, onAccount, onLogout }: {
  name: string; onAccount: () => void; onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  function focusItem(last = false) {
    requestAnimationFrame(() => {
      const items = container.current?.querySelectorAll<HTMLElement>('[role=menuitem]');
      (last ? items?.[items.length - 1] : items?.[0])?.focus();
    });
  }
  return <div className="fieldforce-account" ref={container} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    if (!open || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const items = Array.from(container.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  }}>
    <button type="button" className="fieldforce-account-trigger" ref={trigger} aria-label="Mein Konto" aria-haspopup="menu" aria-expanded={open} aria-controls="fieldforce-account-menu" onClick={() => setOpen(value => !value)} onKeyDown={event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); event.stopPropagation(); setOpen(true); focusItem(event.key === 'ArrowUp'); }
    }}><UserRound size={20} strokeWidth={1.7}/></button>
    {open && <div className="fieldforce-account-popover" id="fieldforce-account-menu" role="menu" aria-label="Mein Konto">
      <p role="presentation">{name}</p>
      <button type="button" role="menuitem" onClick={() => { setOpen(false); onAccount(); }}>Konto & Einstellungen</button>
      <a role="menuitem" href="/datenschutz">Datenschutz</a>
      <button type="button" role="menuitem" onClick={() => { setOpen(false); onLogout(); }}><LogOut size={16}/>Abmelden</button>
    </div>}
  </div>;
}
