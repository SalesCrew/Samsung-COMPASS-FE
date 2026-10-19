'use client';

import { Plus, Save } from 'lucide-react';
import { weightChecks, type AdminMetric } from '../lib/admin';
import { adminMetricUnitOptions } from '../lib/adminUnits';
import { AdminSelect } from './AdminSelect';
import { AdminNumberInput } from './AdminNumberInput';

export function AdminMetricEditor({ metrics, onUpdate, onAdd, onAddSoftbonus, onSave, canSave }: {
  metrics: AdminMetric[];
  onUpdate: (id: string, patch: Partial<AdminMetric>) => void;
  onAdd: () => void;
  onAddSoftbonus: () => void;
  onSave: () => void;
  canSave: boolean;
}) {
  const blocks = [...new Set(metrics.map(metric => metric.block))];
  return <section className="admin-card admin-metrics-card">
    <div className="admin-section-head"><div><span className="admin-step">KENNZAHLEN</span><h2>{metrics.filter(item => item.active).length} aktive Positionen</h2></div><div className="admin-top-actions"><button className="admin-subtle" onClick={onAdd}><Plus size={16} /> KPI hinzufügen</button><button className="admin-subtle" onClick={onAddSoftbonus}><Plus size={16} /> Softbonus hinzufügen</button></div></div>
    <p className="admin-editor-note">Gewichte werden je Block auf 100 % geprüft. Die Einheit gilt für Ziel und Ist; ein Wechsel rechnet bestehende Werte nicht um.</p>
    <div className="admin-metric-table" role="table" aria-label="KPI-Konfiguration">
      <div className="admin-metric-header" role="row">{['Aktiv', 'Kennzahl', 'Block', 'Gewicht %', 'Ziel', 'Ist', 'Einheit'].map(label => <span role="columnheader" key={label}>{label}</span>)}</div>
      {metrics.map(metric => <div className={`admin-metric-row${metric.active ? '' : ' inactive'}`} role="row" key={metric.id}>
        <div role="cell"><label className="admin-toggle"><input type="checkbox" checked={metric.active} onChange={event => onUpdate(metric.id, { active: event.target.checked })} aria-label={`${metric.label} aktiv`} /><i /></label></div>
        <div role="cell"><input className="admin-metric-name" value={metric.label} onChange={event => onUpdate(metric.id, { label: event.target.value })} aria-label={`${metric.label} KPI-Name`} /></div>
        <div role="cell">{blocks.length > 1 ? <AdminSelect compact className="admin-block-select" value={metric.block} onChange={value => onUpdate(metric.id, { block: value })} ariaLabel={`${metric.label} KPI-Block`} menuCaption="KPI-Block" options={blocks.map(block => ({ value: block, label: block }))} /> : <span className="admin-fixed-block" title="Einziger Block in diesem KPI-Set">{metric.block}</span>}</div>
        <div role="cell"><AdminNumberInput value={metric.weight} min={0} max={100} onChange={weight => onUpdate(metric.id, { weight })} ariaLabel={`${metric.label} Gewicht`} /></div>
        <div role="cell"><AdminNumberInput value={metric.target} onChange={target => onUpdate(metric.id, { target: target ?? 0 })} ariaLabel={`${metric.label} Ziel`} /></div>
        <div role="cell"><AdminNumberInput value={metric.actual} onChange={actual => onUpdate(metric.id, { actual: actual ?? 0 })} ariaLabel={`${metric.label} Ist`} /></div>
        <div role="cell"><AdminSelect compact className="admin-unit-select" value={metric.unit} onChange={unit => onUpdate(metric.id, { unit })} ariaLabel={`${metric.label} Einheit`} menuCaption="Einheit für Ziel & Ist" options={adminMetricUnitOptions(metric.unit)} /></div>
      </div>)}
    </div>
    <div className="admin-weight-check">{weightChecks(metrics).map(check => <span className={check.total === 100 && !check.unresolved ? 'valid' : 'invalid'} key={check.block}>{check.block}: <b>{check.unresolved ? 'Gewicht offen' : `${check.total}% / 100%`}</b></span>)}</div>
    <button className="admin-primary" onClick={onSave} disabled={!canSave}><Save size={18} /> Neue Version speichern</button>
  </section>;
}
