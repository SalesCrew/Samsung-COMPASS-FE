'use client';

import { useMemo, useState } from 'react';
import { Check, CircleAlert, RotateCcw, Search } from 'lucide-react';
import {
  IMPORT_DATASETS,
  SPLIT_CATEGORIES,
  mappingFieldsFor,
  suggestColumnMappings,
  type AdminMetric,
  type ColumnDataType,
  type ImportDatasetId,
  type SheetPreview,
  type SourceColumnMapping,
  type SplitCategory,
} from '../lib/admin';
import type { DASetting, SECGroup } from '../lib/groups';
import { AdminSelect } from './AdminSelect';

const DATA_TYPES: { value: ColumnDataType; label: string }[] = [
  { value: 'auto', label: 'Automatisch' },
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Zahl' },
  { value: 'percent', label: 'Prozent' },
  { value: 'currency', label: 'Währung' },
  { value: 'date', label: 'Datum' },
  { value: 'boolean', label: 'Ja / Nein' },
];

type MappingFilter = 'all' | 'mapped' | 'ignored' | 'attention';

export function ColumnMappingWorkspace({
  sheet,
  group,
  setting,
  metrics,
  mappings,
  onMappingsChange,
  datasets,
  onDatasetsChange,
  splitCategories,
  onSplitCategoriesChange,
}: {
  sheet: SheetPreview;
  group: SECGroup['id'];
  setting: DASetting;
  metrics: AdminMetric[];
  mappings: SourceColumnMapping[];
  onMappingsChange: (next: SourceColumnMapping[]) => void;
  datasets: ImportDatasetId[];
  onDatasetsChange: (next: ImportDatasetId[]) => void;
  splitCategories: SplitCategory[];
  onSplitCategoriesChange: (next: SplitCategory[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MappingFilter>('all');
  const mapped = mappings.filter(item => item.dataset !== 'ignore' && item.field).length;
  const ignored = mappings.filter(item => item.dataset === 'ignore').length;
  const attention = mappings.filter(item => item.dataset !== 'ignore' && !item.field).length;

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return mappings.filter(item => {
      const matchesQuery = !normalized || `${item.column} ${item.sourceLabel}`.toLowerCase().includes(normalized);
      const matchesFilter = filter === 'all'
        || (filter === 'mapped' && item.dataset !== 'ignore' && Boolean(item.field))
        || (filter === 'ignored' && item.dataset === 'ignore')
        || (filter === 'attention' && item.dataset !== 'ignore' && !item.field);
      return matchesQuery && matchesFilter;
    });
  }, [filter, mappings, query]);

  function patchColumn(column: string, patch: Partial<SourceColumnMapping>) {
    onMappingsChange(mappings.map(item => item.column === column ? { ...item, ...patch } : item));
  }

  function toggleDataset(dataset: ImportDatasetId) {
    if (datasets.includes(dataset)) {
      const next = datasets.filter(item => item !== dataset);
      onDatasetsChange(next);
      onMappingsChange(mappings.map(item => item.dataset === dataset ? { ...item, dataset: 'ignore', field: '', required: false } : item));
      return;
    }
    onDatasetsChange([...datasets, dataset]);
  }

  function toggleSplit(category: SplitCategory) {
    onSplitCategoriesChange(splitCategories.includes(category)
      ? splitCategories.filter(item => item !== category)
      : [...splitCategories, category]);
  }

  function resetSuggestions() {
    const next = suggestColumnMappings(sheet, group, setting, metrics).map(item => (
      item.dataset !== 'ignore' && !datasets.includes(item.dataset)
        ? { ...item, dataset: 'ignore' as const, field: '', required: false }
        : item
    ));
    onMappingsChange(next);
  }

  return <div className="mapping-workspace">
    <section className="mapping-dataset-section" aria-labelledby="dataset-heading">
      <div className="mapping-section-heading">
        <div><span className="admin-step">DATENSÄTZE</span><h3 id="dataset-heading">Welche Bereiche liefert diese Datei?</h3></div>
        <span className="mapping-count">{datasets.length} aktiv</span>
      </div>
      <div className="dataset-picker">
        {IMPORT_DATASETS.map(dataset => {
          const active = datasets.includes(dataset.id);
          return <button type="button" key={dataset.id} className={active ? 'is-active' : ''} aria-pressed={active} onClick={() => toggleDataset(dataset.id)}>
            <span className="dataset-check">{active ? <Check size={14} /> : null}</span>
            <span><strong>{dataset.label}</strong><small>{dataset.description}</small></span>
          </button>;
        })}
      </div>
    </section>

    <section className="mapping-split-section" aria-labelledby="split-heading">
      <div className="mapping-section-heading">
        <div><span className="admin-step">DATENSATZ-SPLIT</span><h3 id="split-heading">Kategorien für Auswertung und Versionierung</h3></div>
        <span className="mapping-count">{splitCategories.length} gewählt</span>
      </div>
      <p className="admin-muted">Diese Kategorien bestimmen, wie ein Import später getrennt gefiltert und historisiert wird. Die KPI-Kategorie kommt aus der aktiven Konfiguration.</p>
      <div className="split-picker">
        {SPLIT_CATEGORIES.map(category => {
          const active = splitCategories.includes(category.id);
          const unavailable = category.id === 'setting' && group !== 'DA';
          return <button type="button" key={category.id} className={active ? 'is-active' : ''} disabled={unavailable} aria-pressed={active} onClick={() => toggleSplit(category.id)}>
            <span>{category.label}</span><small>{category.description}</small>
          </button>;
        })}
      </div>
    </section>

    <section className="mapping-column-section" aria-labelledby="column-heading">
      <div className="mapping-section-heading mapping-column-heading">
        <div><span className="admin-step">SPALTENMAPPING</span><h3 id="column-heading">Jede Quellspalte festlegen</h3></div>
        <button type="button" className="admin-subtle" onClick={resetSuggestions}><RotateCcw size={15} /> Vorschläge neu erzeugen</button>
      </div>
      <div className="mapping-status-row" aria-label="Mapping-Status">
        <span className="is-mapped"><b>{mapped}</b> zugeordnet</span>
        <span><b>{ignored}</b> bewusst ignoriert</span>
        <span className={attention ? 'is-attention' : 'is-complete'}>{attention ? <CircleAlert size={14} /> : <Check size={14} />}<b>{attention}</b> offen</span>
        <span><b>{mappings.length}</b> insgesamt</span>
      </div>
      <div className="mapping-toolbar">
        <label className="mapping-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Spalte oder Überschrift suchen" aria-label="Spalten suchen" /></label>
        <div className="mapping-filter" role="group" aria-label="Mapping filtern">
          {([['all', 'Alle'], ['mapped', 'Zugeordnet'], ['ignored', 'Ignoriert'], ['attention', 'Offen']] as const).map(([id, label]) => <button type="button" key={id} className={filter === id ? 'is-active' : ''} onClick={() => setFilter(id)}>{label}</button>)}
        </div>
      </div>
      <div className="column-map-table" role="table" aria-label="Excel-Spaltenmapping">
        <div className="column-map-head" role="row"><span>Excel-Quelle</span><span>Zieldatensatz</span><span>Zielfeld</span><span>Datentyp</span><span>Pflicht</span></div>
        <div className="column-map-body">
          {visible.map(item => {
            const fields = item.dataset === 'ignore' ? [] : mappingFieldsFor(item.dataset, group, setting, metrics);
            const rowComplete = item.dataset === 'ignore' || Boolean(item.field);
            return <div className={`column-map-row${rowComplete ? '' : ' has-error'}`} role="row" key={item.column} data-column={item.column}>
              <div className="column-source"><b>{item.column}</b><span>{item.sourceLabel.replace(`${item.column} · `, '')}</span></div>
              <label><span className="sr-only">Datensatz für Spalte {item.column}</span><AdminSelect compact ariaLabel={`Datensatz für Spalte ${item.column}`} value={item.dataset} onChange={value => {
                const dataset = value as ImportDatasetId | 'ignore';
                patchColumn(item.column, { dataset, field: '', required: dataset === 'ignore' ? false : item.required });
              }} options={[{ value: 'ignore', label: 'Ignorieren' }, ...IMPORT_DATASETS.filter(dataset => datasets.includes(dataset.id)).map(dataset => ({ value: dataset.id, label: dataset.short }))]} /></label>
              <label><span className="sr-only">Zielfeld für Spalte {item.column}</span><AdminSelect compact searchable ariaLabel={`Zielfeld für Spalte ${item.column}`} value={item.field} disabled={item.dataset === 'ignore'} onChange={value => patchColumn(item.column, { field: value })} options={[{ value: '', label: 'Feld wählen' }, ...fields]} /></label>
              <label><span className="sr-only">Datentyp für Spalte {item.column}</span><AdminSelect compact ariaLabel={`Datentyp für Spalte ${item.column}`} value={item.dataType} disabled={item.dataset === 'ignore'} onChange={value => patchColumn(item.column, { dataType: value as ColumnDataType })} options={DATA_TYPES} /></label>
              <label className="mapping-required"><input type="checkbox" aria-label={`Spalte ${item.column} ist Pflichtfeld`} checked={item.required} disabled={item.dataset === 'ignore'} onChange={event => patchColumn(item.column, { required: event.target.checked })} /><i /></label>
            </div>;
          })}
          {!visible.length ? <div className="mapping-empty">Keine Spalte entspricht diesem Filter.</div> : null}
        </div>
      </div>
      <p className="mapping-footnote">„Ignorieren“ ist eine explizite Entscheidung. Leere Werte, echte 0, „x“, Excel-Fehler und „nicht anwendbar“ bleiben im späteren Importvertrag getrennte Zustände.</p>
    </section>
  </div>;
}
