'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';

export type AdminSelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

type AdminSelectProps = {
  value: string;
  options: AdminSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  menuCaption?: string;
  disabled?: boolean;
  placeholder?: string;
  compact?: boolean;
  searchable?: boolean;
  className?: string;
};

type PopoverPosition = { left: number; top: number; width: number; maxHeight: number; placement: 'top' | 'bottom' };

export function AdminSelect({
  value,
  options,
  onChange,
  ariaLabel,
  menuCaption,
  disabled = false,
  placeholder = 'Auswählen',
  compact = false,
  searchable = false,
  className = '',
}: AdminSelectProps) {
  const reactId = useId();
  const listboxId = `admin-select-${reactId.replace(/:/g, '')}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  const selectedOption = options.find(option => option.value === value);
  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('de-AT');
    if (!normalized) return options;
    return options.filter(option => `${option.label} ${option.description ?? ''}`.toLocaleLowerCase('de-AT').includes(normalized));
  }, [options, query]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 12;
    // The caption, padding and optional search box need their own space. A one-
    // option menu previously left only 12 px visible for a 38 px option.
    const optionHeight = popoverRef.current?.querySelector('.admin-select-options')?.scrollHeight
      ?? Math.max(43, filteredOptions.reduce((height, option) => height + (option.description ? 72 : 43), 0));
    const chromeHeight = 12 + (menuCaption ? 30 : 0) + (searchable ? 44 : 0);
    const desiredHeight = Math.min(searchable ? 374 : 330, optionHeight + chromeHeight);
    const roomBelow = window.innerHeight - rect.bottom - viewportPadding;
    const roomAbove = rect.top - viewportPadding;
    const placement = roomBelow < Math.min(desiredHeight, 220) && roomAbove > roomBelow ? 'top' : 'bottom';
    const available = placement === 'bottom' ? roomBelow : roomAbove;
    const width = Math.min(Math.max(rect.width, 220), window.innerWidth - viewportPadding * 2);
    const left = Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - width - viewportPadding);
    const maxHeight = Math.max(40, Math.min(desiredHeight, available - 7));
    const top = placement === 'bottom' ? rect.bottom + 7 : Math.max(viewportPadding, rect.top - maxHeight - 7);
    setPosition({ left, top, width, maxHeight, placement });
  }, [filteredOptions, menuCaption, searchable]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !popoverRef.current?.contains(target)) { setOpen(false); setQuery(''); }
    };
    const handleViewportChange = () => updatePosition();
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    const frame = requestAnimationFrame(() => {
      updatePosition();
      if (searchable) searchRef.current?.focus(); else popoverRef.current?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open, searchable, updatePosition]);

  function openMenu() {
    const selectedIndex = filteredOptions.findIndex(option => option.value === value && !option.disabled);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : Math.max(0, filteredOptions.findIndex(option => !option.disabled)));
    setOpen(true);
  }

  function close({ restoreFocus = true } = {}) {
    setOpen(false);
    setQuery('');
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function choose(option: AdminSelectOption) {
    if (option.disabled) return;
    onChange(option.value);
    close();
  }

  function moveActive(direction: 1 | -1) {
    if (!filteredOptions.length) return;
    let next = activeIndex;
    for (let count = 0; count < filteredOptions.length; count += 1) {
      next = (next + direction + filteredOptions.length) % filteredOptions.length;
      if (!filteredOptions[next]?.disabled) break;
    }
    setActiveIndex(next);
    requestAnimationFrame(() => document.getElementById(`${listboxId}-option-${next}`)?.scrollIntoView({ block: 'nearest' }));
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key === 'Tab') { close({ restoreFocus: false }); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) openMenu();
      else moveActive(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (open && event.key === 'Home') { event.preventDefault(); setActiveIndex(Math.max(0, filteredOptions.findIndex(option => !option.disabled))); return; }
    if (open && event.key === 'End') { event.preventDefault(); setActiveIndex(Math.max(0, filteredOptions.findLastIndex(option => !option.disabled))); return; }
    if ((event.key === 'Enter' || event.key === ' ') && !searchable) {
      event.preventDefault();
      if (!open) openMenu();
      else if (filteredOptions[activeIndex]) choose(filteredOptions[activeIndex]);
    }
    if (event.key === 'Enter' && searchable && open && filteredOptions[activeIndex]) {
      event.preventDefault();
      choose(filteredOptions[activeIndex]);
    }
  }

  const popover = open && position && typeof document !== 'undefined' ? createPortal(
    <div
      ref={popoverRef}
      id={listboxId}
      className={`admin-select-popover is-${position.placement}`}
      style={{ left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight }}
      role="listbox"
      aria-label={ariaLabel}
      aria-activedescendant={filteredOptions[activeIndex] ? `${listboxId}-option-${activeIndex}` : undefined}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      {menuCaption ? <span className="admin-select-caption">{menuCaption}</span> : null}
      {searchable ? <div className="admin-select-search"><Search size={14} /><input ref={searchRef} value={query} onChange={event => { setQuery(event.target.value); setActiveIndex(0); }} placeholder="Option suchen" aria-label={`${ariaLabel} durchsuchen`} /></div> : null}
      <div className="admin-select-options">
        {filteredOptions.map((option, index) => <button
          type="button"
          id={`${listboxId}-option-${index}`}
          key={option.value}
          data-value={option.value}
          role="option"
          aria-selected={option.value === value}
          disabled={option.disabled}
          className={`${option.value === value ? 'is-selected ' : ''}${index === activeIndex ? 'is-active' : ''}`.trim()}
          onPointerMove={() => setActiveIndex(index)}
          onClick={() => choose(option)}
        >
          <span><strong>{option.label}</strong>{option.description ? <small>{option.description}</small> : null}</span>
          <i aria-hidden="true">{option.value === value ? <Check size={13} /> : null}</i>
        </button>)}
        {!filteredOptions.length ? <p className="admin-select-empty">Keine passende Option</p> : null}
      </div>
    </div>,
    document.body,
  ) : null;

  return <>
    <button
      ref={triggerRef}
      type="button"
      className={`admin-select-trigger${compact ? ' is-compact' : ''}${className ? ` ${className}` : ''}`}
      role="combobox"
      aria-label={ariaLabel}
      aria-controls={listboxId}
      aria-expanded={open}
      aria-haspopup="listbox"
      disabled={disabled}
      onClick={() => { if (open) close({ restoreFocus: false }); else { setQuery(''); openMenu(); } }}
      onKeyDown={handleKeyDown}
    >
      <span className={`admin-select-value${!selectedOption ? ' is-placeholder' : ''}`}>{selectedOption?.label ?? placeholder}</span>
      <span className="admin-select-chevron" aria-hidden="true"><ChevronDown size={14} /></span>
    </button>
    {popover}
  </>;
}
