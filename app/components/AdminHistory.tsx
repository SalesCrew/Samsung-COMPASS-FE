'use client';

import { ChevronRight, Download, FileSpreadsheet, Settings2 } from 'lucide-react';
import { type ConfigVersion, type ImportVersion } from '../lib/admin';

const phaseLabels = { TARGET_INITIALIZATION: 'Monatsstart / Targets', WEEKLY_PROGRESS: 'Weekly Progress / MTD', MONTH_FINALIZATION: 'Monatsabschluss' };

export function AdminHistory({ configs, imports, onExport, onLoad, live=false }: {
  live?: boolean; configs: ConfigVersion[]; imports: ImportVersion[]; onExport: () => void; onLoad: (version: ConfigVersion) => void;
}) {
  return <div className="admin-page-grid admin-audit-workspace">
    <section className="admin-card"><div className="admin-section-head"><div><span className="admin-step">NACHVOLLZIEHBAR</span><h2>Import-Snapshots</h2></div><button className="admin-subtle" onClick={onExport}><Download size={16} /> JSON exportieren</button></div>
      <p className="admin-editor-note">{live?'Entwürfe und Veröffentlichungen sind in der Datenbank versioniert.':'Beispiel-Freigaben sind fiktiv. Eigene Freigaben speichern nur Metadaten lokal.'} MTD-Stände ersetzen den vorherigen Stand; sie werden nie summiert.</p>
      <div className="admin-timeline admin-meeting-ledger">{[...imports].reverse().map(item => {
        const sequence = imports.filter(version => version.group === item.group && version.month === item.month);
        return <article key={item.id}><span className="admin-time-icon"><FileSpreadsheet size={19} /></span><div>
          <strong>{item.group} · {item.month} · {phaseLabels[item.phase]}</strong>
          <small>{new Date(item.saved).toLocaleString('de-AT')} · {item.filename} · {item.sheet}</small>
          <p>Aktualisiert: {item.changed.join(', ') || '—'}.<br />Übernommen: {item.carried.join(', ') || 'Keine vorherigen Teilstände'}.</p>
          <span>v{sequence.findIndex(version => version.id === item.id) + 1} im Gruppenmonat · {live?(item.status==='released'?'Veröffentlicht':'Entwurf'):item.origin === 'meeting-demo' ? 'DEMO · Beispiel-Freigabe' : 'Nur lokal gespeichert'}</span>
        </div></article>;
      })}</div>
    </section>
    <section className="admin-card"><span className="admin-step">GÜLTIGKEIT & ÄNDERUNGEN</span><h2>KPI-Konfigurationen</h2>
      <div className="admin-timeline admin-meeting-ledger">{[...configs].reverse().map(item => {
        const sequence = configs.filter(version => version.group === item.group && version.setting === item.setting);
        const index = sequence.findIndex(version => version.id === item.id);
        const prior = sequence[index - 1];
        const differences = item.metrics.filter(metric => {
          const old = prior?.metrics.find(previous => previous.id === metric.id);
          return !old || old.weight !== metric.weight || old.target !== metric.target || old.actual !== metric.actual || old.active !== metric.active || old.label !== metric.label || old.block !== metric.block || old.unit !== metric.unit;
        });
        return <article key={item.id}><span className="admin-time-icon"><Settings2 size={19} /></span><div>
          <strong>v{index + 1} · {item.group}{item.group === 'DA' ? ` · ${item.setting}` : ''} · gültig ab {item.effective}</strong>
          <small>{new Date(item.saved).toLocaleString('de-AT')} · {live?'Gespeicherte Version':item.origin === 'meeting-demo' ? 'DEMO-Beispiel' : 'Lokale Version'}</small>
          <p>{item.note}</p>
          <p>{prior ? `${differences.length} geänderte oder neue KPI-Positionen: ${differences.map(metric => metric.label).join(', ') || 'keine'}.` : `${item.metrics.length} Positionen als erste Version gespeichert.`}</p>
          <button className="admin-text-link" onClick={() => onLoad(item)}>Version ansehen <ChevronRight size={16} /></button>
        </div></article>;
      })}</div>
    </section>
    <p className="admin-muted">{live?'Veröffentlichte Revisionen bleiben erhalten. Der Export enthält Konfigurationen und Importmetadaten.':'Beispieldaten und lokale Änderungen sind im JSON getrennt gekennzeichnet. Produktive Revisionen benötigen Backend, Rechte und unveränderliche Audit-Logs.'}</p>
  </div>;
}
