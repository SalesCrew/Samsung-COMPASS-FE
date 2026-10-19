'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { AdminSelect } from './AdminSelect';

const monthName = new Intl.DateTimeFormat('de-AT', { month: 'long', year: 'numeric' });
const dateName = new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
const pad = (number: number) => String(number).padStart(2, '0');
const monthValue = (year: number, month: number) => `${year}-${pad(month + 1)}`;
const dayValue = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseDay = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day) && month >= 1 && month <= 12 && day >= 1 && day <= 31
    ? new Date(year, month - 1, day)
    : new Date();
};

export function AdminMonthPicker({ value, onChange, ariaLabel, min, max }: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  min?: string;
  max?: string;
}) {
  const year = Number(value.slice(0, 4)) || new Date().getFullYear();
  const first = min ?? `${year - 2}-01`;
  const last = max ?? `${year + 2}-12`;
  const options = useMemo(() => {
    const result = [];
    for (let candidateYear = Number(first.slice(0, 4)); candidateYear <= Number(last.slice(0, 4)); candidateYear += 1) {
      for (let month = 0; month < 12; month += 1) {
        const candidate = monthValue(candidateYear, month);
        if (candidate >= first && candidate <= last) result.push({ value: candidate, label: monthName.format(new Date(candidateYear, month, 1)) });
      }
    }
    return result;
  }, [first, last]);
  return <AdminSelect ariaLabel={ariaLabel} searchable value={value} onChange={onChange} options={options} />;
}

export function AdminDatePicker({ value, onChange, ariaLabel }: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const id = useId().replace(/:/g, '');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const day = parseDay(value);
    return { year: day.getFullYear(), month: day.getMonth() };
  });
  const [position, setPosition] = useState({ left: 0, top: 0, width: 282 });
  const selected = parseDay(value);

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(282, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    const top = window.innerHeight - rect.bottom >= 326 || rect.top < 326
      ? rect.bottom + 7
      : Math.max(12, rect.top - 326);
    setPosition({ left, top, width });
  }, []);

  useLayoutEffect(() => { if (open) updatePosition(); }, [open, updatePosition]);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    const frame = requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', closeOutside);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  function changeMonth(offset: number) {
    const next = new Date(view.year, view.month + offset, 1);
    setView({ year: next.getFullYear(), month: next.getMonth() });
  }

  const firstWeekday = (new Date(view.year, view.month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const days = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => index < firstWeekday ? null : index - firstWeekday + 1);

  return <>
    <button
      ref={triggerRef}
      type="button"
      className="admin-date-trigger"
      aria-label={ariaLabel}
      aria-expanded={open}
      aria-controls={`admin-calendar-${id}`}
      aria-haspopup="dialog"
      onClick={() => {
        if (!open) { const day = parseDay(value); setView({ year: day.getFullYear(), month: day.getMonth() }); }
        setOpen(current => !current);
      }}
    ><span>{dateName.format(selected)}</span><span className="admin-date-trigger-icons"><CalendarDays size={15} /><ChevronDown size={14} /></span></button>
    {open && typeof document !== 'undefined' ? createPortal(
      <div
        ref={panelRef}
        id={`admin-calendar-${id}`}
        className="admin-date-popover"
        role="dialog"
        aria-label={`${ariaLabel} auswählen`}
        tabIndex={-1}
        style={position}
        onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); } }}
      >
        <div className="admin-date-heading"><strong>{monthName.format(new Date(view.year, view.month, 1))}</strong><div><button type="button" aria-label="Vorheriger Monat" onClick={() => changeMonth(-1)}><ChevronLeft size={16} /></button><button type="button" aria-label="Nächster Monat" onClick={() => changeMonth(1)}><ChevronRight size={16} /></button></div></div>
        <div className="admin-date-grid" role="grid" aria-label={monthName.format(new Date(view.year, view.month, 1))}>
          {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => <span className="admin-date-weekday" key={day}>{day}</span>)}
          {days.map((day, index) => day === null ? <span key={`blank-${index}`} /> : <button
            key={day}
            type="button"
            className={dayValue(new Date(view.year, view.month, day)) === value ? 'is-selected' : ''}
            aria-label={dateName.format(new Date(view.year, view.month, day))}
            aria-pressed={dayValue(new Date(view.year, view.month, day)) === value}
            onClick={() => { onChange(dayValue(new Date(view.year, view.month, day))); setOpen(false); triggerRef.current?.focus(); }}
          >{day}</button>)}
        </div>
        <button type="button" className="admin-date-today" onClick={() => { onChange(dayValue(new Date())); setOpen(false); triggerRef.current?.focus(); }}>Heute wählen</button>
      </div>, document.body,
    ) : null}
  </>;
}
