'use client';

import { useState } from 'react';
import { Check, CircleAlert, RotateCcw, Search } from 'lucide-react';
import type { AdminMetric, SheetPreview, SourceColumnMapping } from '../lib/admin';
import { closingDefinitions, closingMappings, mappingConflicts, type ClosingResult } from '../lib/closingImport';
import type { SECGroup } from '../lib/groups';
import { AdminSelect } from './AdminSelect';
import './closingImport.css';

export function ClosingMappingWorkspace({ sheet, group, metrics, mappings, onChange }: {
  sheet: SheetPreview; group: SECGroup['id']; metrics: AdminMetric[]; mappings: SourceColumnMapping[]; onChange: (next: SourceColumnMapping[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [section, setSection] = useState('all');
  const definitions = closingDefinitions(group, metrics);
  const sections = [...new Set(mappings.map(item => item.sourceSection).filter((section): section is string => Boolean(section)))];
  const conflicts = mappingConflicts(mappings);
  const active = mappings.filter(item => item.dataset !== 'ignore');
  const patch = (id: string, change: Partial<SourceColumnMapping>) => onChange(mappings.map(item => item.id === id ? { ...item, ...change } : item));
  const options = [{ value: '', label: '—', description: 'Keine Spalte gewählt' }, ...sheet.columns.map(column => ({ value: column.key, label: column.key, description: column.label || 'Ohne Überschrift' }))];
  const filtered = mappings.filter(item => (section === 'all' || item.sourceSection === section)
    && `${item.column} ${item.sourceLabel}`.toLowerCase().includes(query.trim().toLowerCase()));

  return <div className="closing-mapping">
    <div className="mapping-section-heading"><div><span className="admin-step">PIVOT LISTE · {group === 'DA' ? 'HA / DA' : group}</span><h3>Felder aus der Originaldatei</h3></div>
      <button className="admin-subtle" type="button" onClick={() => onChange(closingMappings(sheet, group, metrics))}><RotateCcw size={15} /> Zuordnung zurücksetzen</button></div>
    <p className="admin-muted">Der Buchstabe bestimmt die Quellspalte. Die Feldnamen und Bereiche entsprechen dem Excel. Nicht benötigte Felder sind deaktiviert.</p>
    <div className="closing-section-tabs" aria-label="Excel-Datensätze">
      {[{ label: 'Alle', value: 'all' }, ...sections.map(label => ({ label, value: label }))].map(item => <button type="button" key={item.value} aria-pressed={section === item.value} onClick={() => setSection(item.value)}>{item.label}</button>)}
    </div>
    <div className="mapping-toolbar"><label className="mapping-search"><Search size={16} /><input aria-label="Pivot-Felder suchen" placeholder="Feld oder Spalte suchen" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <span className="mapping-count">{active.length} aktiv · {mappings.length - active.length} deaktiviert</span></div>
    {conflicts.size ? <div className="closing-conflict" role="alert"><CircleAlert size={16} /><div><strong>Spaltenkonflikt</strong>{[...conflicts].map(([column, labels]) => <p key={column}>Spalte {column} ist mehrfach zugeordnet: {labels.join(' und ')}. Wähle eine andere Spalte oder deaktiviere eines der Felder.</p>)}</div></div> : null}
    <div className="closing-map-table" role="table" aria-label="Pivot-Spaltenmapping">
      <div className="closing-map-head" role="row"><span>Excel-Feld</span><span>Spalte</span><span>Aktive Konfiguration</span><span>Datensatz</span><span>Übernehmen</span></div>
      <div className="closing-map-body">
        {filtered.map(item => {
          const enabled = item.dataset !== 'ignore';
          const definition = definitions.find(def => def.id === item.id)!;
          const configured = metrics.find(metric => metric.active && (item.id === `config:${metric.dataset ?? (group === 'ST' ? 'softbonus' : 'sellout')}:${metric.id}` || item.field === `${metric.id}.achievement`));
          const custom = item.id?.startsWith('config:');
          const current = sheet.columns.find(column => column.key === item.column);
          const conflict = enabled && conflicts.has(item.column);
          const missing = enabled && !item.column;
          const changed = current && current.label !== item.sourceLabel;
          return <div role="row" key={item.id} data-mapping-id={item.id} className={`closing-map-row${conflict || missing ? ' has-error' : ''}${enabled ? '' : ' is-disabled'}`}>
            <div className="closing-field"><strong>{custom ? current?.label || 'Excel-Feld wählen' : item.sourceLabel}</strong>{definition.required && <small>Pflichtfeld</small>}{!custom && enabled && changed && <small>Excel {item.column}: {current.label || 'ohne Überschrift'}</small>}{conflict && <span>Spalte {item.column} mehrfach verwendet</span>}{missing && <span>Quellspalte fehlt</span>}</div>
            <AdminSelect compact searchable ariaLabel={`Quellspalte für ${item.sourceLabel}`} value={item.column} disabled={!enabled} onChange={column => patch(item.id!, { column, sourceSection: custom ? 'Aktive Konfiguration' : sheet.columns.find(source => source.key === column)?.section || definition.section })} options={options} />
            <span className="closing-configured-field">{configured ? <>{configured.label}<small>{configured.dataset === 'softbonus' || group === 'ST' ? 'Softbonus' : 'KPI'} · {configured.weight ?? '—'} % Gewicht</small></> : '—'}</span>
            <span className="closing-source-section">{custom ? current?.section || '—' : item.sourceSection}</span>
            <label className="mapping-required"><input type="checkbox" aria-label={`${item.sourceLabel} übernehmen`} checked={enabled} onChange={event => patch(item.id!, { dataset: event.target.checked ? definition.dataset : 'ignore' })} /><i /></label>
          </div>;
        })}
        {!filtered.length && <div className="mapping-empty">Keine passenden Felder.</div>}
      </div>
    </div>
    <p className="mapping-footnote">Pro aktivem Feld eine eigene Quellspalte. Leere Werte, echte 0, „x“ und Excel-Fehler bleiben getrennt.</p>
  </div>;
}

export function ClosingImportPreview({ result, imported = false }: { result: ClosingResult; imported?: boolean }) {
  return <section className="closing-preview" aria-label={imported ? 'Lokal importierte Datensätze' : 'Closing-Datenprüfung'}>
    <h3>{imported ? <><Check size={16} /> Lokal importiert</> : 'Datenprüfung'}</h3>
    <p><strong>{result.records.length}</strong> Datensätze im gewählten Monat · {result.otherMonths} Zeilen aus anderen Monaten ausgelassen</p>
    {result.specialValues > 0 && <p>{result.specialValues} Sonderwerte („x“ / nicht anwendbar) bleiben erhalten.</p>}
    {result.issues.length > 0 && <div className="closing-conflict" role="alert"><CircleAlert size={16} /><div><strong>{result.issues.length} Fehler vor dem Import beheben</strong>{result.issues.slice(0, 6).map((issue, index) => <p key={index}>{issue.row ? `Zeile ${issue.row}${issue.column ? ` · ${issue.column}` : ''}: ` : ''}{issue.message}</p>)}{result.issues.length > 6 && <p>Weitere {result.issues.length - 6} Fehler.</p>}</div></div>}
    {imported && <p>Die zugeordneten Zellwerte sind für diese Sitzung im Speicher. Nach Neuladen erneut einlesen.</p>}
  </section>;
}
