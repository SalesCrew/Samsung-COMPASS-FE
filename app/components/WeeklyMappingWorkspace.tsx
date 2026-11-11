'use client';
import type { AdminMetric, SheetPreview, SourceColumnMapping } from '../lib/admin';
import type { SECGroup } from '../lib/groups';
import { importFieldId, weeklyFields, type ImportProblem } from '../lib/importFeedback';
import { AdminSelect } from './AdminSelect';
import { ImportFieldFeedback } from './ImportFeedback';

export function WeeklyMappingWorkspace({ sheet, group, metrics, mappings, problems, onChange }: {
  sheet: SheetPreview; group: SECGroup['id']; metrics: AdminMetric[]; mappings: SourceColumnMapping[]; problems: ImportProblem[]; onChange: (next: SourceColumnMapping[]) => void;
}) {
  const fields = weeklyFields(metrics, group, mappings);
  const options = [{ value: '', label: 'Excel-Spalte auswählen' }, ...sheet.columns.map(c => ({ value: c.key, label: `${c.key} · ${c.label || 'Ohne Überschrift'}`, description: c.section }))];
  return <div className="weekly-mapping">
    <p className="admin-muted">Wähle zu jedem Wert die passende Spalte aus deiner Excel-Datei. Die Buchstaben und Überschriften helfen dir beim Zuordnen. Fehlende Spalten werden nicht automatisch ergänzt.</p>
    {['identity', 'metrics'].map(section => <section key={section} className="weekly-mapping-section">
      <h3>{section === 'identity' ? 'Person und Markt erkennen' : 'Monatsziele und Istwerte'}</h3>
      <p className="admin-muted">{section === 'identity' ? 'Mindestens SEC-ID, Name oder Markt muss zugeordnet sein. Prüfe die erkannten Personen anschließend unten.' : 'Für jede Kennzahl ist das Monatsziel nötig. Ordne auch vorhandene Istwerte zu. Ein Wochenstand ist der kumulierte Stand des Monats.'}</p>
      <div className="weekly-mapping-fields">{fields.filter(f => section === 'identity' ? ['identity', 'assignment'].includes(f.dataset) : !['identity', 'assignment'].includes(f.dataset)).map(item => {
        const invalid = problems.some(p => p.target === item.field);
        return <div className="weekly-mapping-field" id={importFieldId(item.field)} key={item.field} tabIndex={-1}>
          <span className="import-field-label">{item.sourceLabel.replace(/ · (?:Ziel|Target)$/, ' · Monatsziel')}{item.field.endsWith('.target') && <small>Pflichtfeld</small>}</span>
          <AdminSelect searchable ariaLabel={`Excel-Spalte für ${item.sourceLabel}`} value={item.column} options={options} invalid={invalid} describedBy={invalid ? importFieldId(item.field) + '-help' : undefined} onChange={column => onChange([...mappings.filter(m => m.field !== item.field), { ...item, id: item.id || item.field, column }])} />
          <ImportFieldFeedback problems={problems} field={item.field} />
        </div>;
      })}</div>
    </section>)}
  </div>;
}
