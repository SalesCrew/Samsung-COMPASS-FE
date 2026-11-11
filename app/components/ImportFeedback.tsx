'use client';
import type { ImportProblem } from '../lib/importFeedback';
import { importFieldId } from '../lib/importFeedback';

export function focusImportField(target: string) {
  window.dispatchEvent(new Event('sec-import-reveal'));
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const wrapper = document.getElementById(importFieldId(target)) ?? document.getElementById(importFieldId('mapping'));
    if (!wrapper) return;
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const control = Array.from(wrapper.querySelectorAll<HTMLElement>('summary, button:not([disabled]), input:not([disabled]), [tabindex]')).find(element => element.getClientRects().length > 0);
    (control ?? wrapper).focus({ preventScroll: true });
  }));
}

export function ImportFieldFeedback({ problems, field }: { problems: ImportProblem[]; field: string }) {
  const items = problems.filter(p => p.target === field);
  if (!items.length) return null;
  return <div id={importFieldId(field) + '-help'} className="import-field-feedback">
    {items.slice(0, 3).map((p, i) => <p key={i}>{p.location && <small>{p.location}</small>}<strong>{p.title}</strong><span>{p.solution}</span></p>)}
    {items.length > 3 && <small>Weitere {items.length - 3} Hinweise zu diesem Feld findest du in der Fehlerübersicht.</small>}
  </div>;
}

export function ImportProblemList({ problems }: { problems: ImportProblem[] }) {
  function entries(items: ImportProblem[], offset = 0) { return <ol start={offset + 1}>{items.map((p, i) => <li key={i}>
    {p.location && <small>{p.location}</small>}<strong>{p.title}</strong><p>{p.solution}</p>
    <button type="button" className="admin-text-link" onClick={() => focusImportField(p.target)}>{p.target === 'source' ? 'Zur Datei' : p.target.startsWith('person-row:') ? 'Zur Personenzuordnung' : 'Zum Feld'} →</button>
  </li>)}</ol>; }
  if (!problems.length) return null;
  return <div className="import-problem-list" aria-label="Fehlerübersicht">
    {entries(problems.slice(0, 4))}
    {problems.length > 4 && <details><summary>Alle {problems.length} Hinweise anzeigen</summary>{entries(problems.slice(4), 4)}</details>}
  </div>;
}
