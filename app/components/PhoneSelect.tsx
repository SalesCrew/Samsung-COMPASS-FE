'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/** Keep choice lists inside the scaled phone rather than using an unscaled native menu. */
export function PhoneSelect({ value, options, onChange, ariaLabel }: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const id = useId();
  const listId = `phone-select-${id}`;
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  function expand() {
    setActive(Math.max(0, options.findIndex(option => option.value === value)));
    setOpen(true);
  }
  function choose(index: number) {
    if (!options[index]) return;
    onChange(options[index].value);
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }
  function move(index: number) {
    setActive(index);
    requestAnimationFrame(() => document.getElementById(`${listId}-${index}`)?.scrollIntoView({ block: 'nearest' }));
  }

  return <div className="phone-select" ref={container}>
    <button type="button" ref={trigger} role="combobox" aria-label={ariaLabel}
      aria-expanded={open} aria-controls={listId} aria-haspopup="listbox"
      aria-activedescendant={open ? `${listId}-${active}` : undefined}
      className="phone-select-trigger" onClick={() => open ? setOpen(false) : expand()}
      onKeyDown={event => {
        if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); return; }
        if (event.key === 'Tab') { setOpen(false); return; }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          if (!open) expand();
          else move((active + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
        } else if (open && (event.key === 'Home' || event.key === 'End')) {
          event.preventDefault(); move(event.key === 'Home' ? 0 : options.length - 1);
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault(); if (open) choose(active); else expand();
        }
      }}><span>{selected?.label ?? 'Auswählen'}</span><ChevronDown size={28} aria-hidden="true" /></button>
    {open && <div id={listId} role="listbox" aria-label={ariaLabel} className="phone-select-options">
      {options.map((option, index) => <div id={`${listId}-${index}`} role="option"
        aria-selected={option.value === value} key={option.value}
        className={index === active ? 'is-active' : ''}
        onPointerDown={event => event.preventDefault()} onPointerMove={() => setActive(index)}
        onClick={() => choose(index)}><span>{option.label}</span>{option.value === value && <Check size={27} aria-hidden="true" />}</div>)}
    </div>}
  </div>;
}
