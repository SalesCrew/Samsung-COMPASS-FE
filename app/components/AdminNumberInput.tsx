'use client';

import { useState } from 'react';

export function AdminNumberInput({ value, onChange, ariaLabel, min, max }: {
  value: number | null;
  onChange: (value: number | null) => void;
  ariaLabel: string;
  min?: number;
  max?: number;
}) {
  // Keep the editable text separate from the numeric model: intermediate values
  // like "62." must survive a render while the next digit is being typed.
  const [draft, setDraft] = useState<string | null>(null);
  const restingValue = value === null || value === 0 ? '' : String(value);
  const outsideRange = value !== null && ((min !== undefined && value < min) || (max !== undefined && value > max));
  return <input
    type="text"
    inputMode="decimal"
    className="admin-number-input"
    value={draft ?? restingValue}
    placeholder="0"
    aria-label={ariaLabel}
    aria-invalid={outsideRange || undefined}
    onFocus={event => { setDraft(restingValue); event.currentTarget.select(); }}
    onClick={event => event.currentTarget.select()}
    onBlur={() => setDraft(null)}
    onChange={event => {
      const next = event.target.value;
      if (!/^-?\d*(?:[.,]\d*)?$/.test(next)) return;
      setDraft(next);
      if (next === '') { onChange(null); return; }
      const number = Number(next.replace(',', '.'));
      if (Number.isFinite(number)) onChange(number);
    }}
  />;
}
