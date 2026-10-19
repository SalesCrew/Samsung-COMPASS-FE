'use client';

import { useState } from 'react';
import { ArrowRight, ArrowUpRight, CircleHelp, FileSpreadsheet, RotateCcw, Settings2, SlidersHorizontal } from 'lucide-react';
import { SEC_GROUPS, type SECGroup } from '../lib/groups';
import { type ConfigVersion, type ImportVersion } from '../lib/admin';
import { MEETING_PEOPLE } from '../lib/adminDemo';
import { average, dashboardResults, dashboardTrend, DEFAULT_DASHBOARD_SCOPE, type DashboardFocus, type DashboardMonth, type DashboardScope } from '../lib/adminDashboard';
const euro=(value:number)=>new Intl.NumberFormat('de-AT',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
import { AdminSelect } from './AdminSelect';
import type { LiveDashboardSource } from '../lib/adminLiveData';

const MONTHS: { value: DashboardMonth; label: string }[] = [
  { value: '2026-09', label: 'September 2026' }, { value: '2026-08', label: 'August 2026' },
  { value: '2026-07', label: 'Juli 2026' }, { value: '2026-06', label: 'Juni 2026' },
  { value: '2026-05', label: 'Mai 2026' }, { value: '2026-04', label: 'April 2026' },
];
const FOCUS: { value: DashboardFocus; label: string; description: string }[] = [
  { value: 'all', label: 'Alle Bereiche', description: 'Alle fiktiven Datensätze' },
  { value: 'on-track', label: 'Beide ≥ 95 %', description: 'Sell-out und Softbonus im Demo-Ziel' },
  { value: 'watch', label: '90–94 % Bereich', description: 'Beide ≥ 90 %, mindestens ein Wert unter 95 %' },
  { value: 'below', label: 'Mindestens ein Wert < 90 %', description: 'Beobachtungsfilter, keine Punktevergabe' },
  { value: 'model-open', label: 'Modell offen · ST', description: 'Keine bestätigte Prämien-/Jahreslogik' },
];
const percent = (value: number | null) => value === null ? '—' : `${value.toLocaleString('de-AT', { maximumFractionDigits: 1 })}%`;
const scoreHeight = (value: number | null, ceiling?:number) => value === null ? '0%' : `${Math.max(ceiling===undefined?5:0, Math.min(100, value / (ceiling??110) * 100))}%`;

export function AdminOverview({ imports, configs, onOpenImport, onOpenConfiguration, onOpenAnalysis, source }: {
  imports: ImportVersion[];
  configs: ConfigVersion[];
  onOpenImport: () => void;
  onOpenConfiguration: (group: SECGroup['id']) => void;
  onOpenAnalysis: (scope: DashboardScope) => void;
  source?: LiveDashboardSource;
}) {
  const initialScope={...DEFAULT_DASHBOARD_SCOPE,month:source?.initialMonth??source?.months[0]?.value??DEFAULT_DASHBOARD_SCOPE.month};
  const [scope, setScope] = useState<DashboardScope>(initialScope);
  const updateScope = (patch: Partial<DashboardScope>) => setScope(current => ({ ...current, ...patch }));
  const persons=source?.people??MEETING_PEOPLE;
  const months=source?.months??MONTHS;
  const markets = [...new Set(persons.filter(person => scope.group === 'all' || person.group === scope.group).map(person => person.market))];
  const results = dashboardResults(scope,source);
  const comparable = results.filter(item => item.achievement !== null);
  const achievement = average(comparable.map(item => item.achievement));
  const softbonus = average(comparable.map(item => item.softbonus));
  const financial=source?results.filter(r=>r.premium!==null):comparable;
  const premium = financial.reduce((sum, item) => sum + (item.premium ?? 0), 0);
  const trend = dashboardTrend(scope,source);
  const chartCeiling=source?Math.max(100,Math.ceil(Math.max(0,...trend.flatMap(t=>[t.achievement??0,t.softbonus??0]))/25)*25):undefined;
  const groups = SEC_GROUPS.map(group => {
    const members = results.filter(item => item.person.group === group.id);
    const source = imports.filter(item => item.group === group.id && item.month === scope.month && item.status === 'released').sort((a, b) => a.saved.localeCompare(b.saved)).at(-1);
    const config = configs.filter(item => item.group === group.id).sort((a, b) => a.saved.localeCompare(b.saved)).at(-1);
    return { group, members, source, config, achievement: average(members.map(item => item.achievement)), softbonus: average(members.map(item => item.softbonus)), premium: members.reduce((sum, item) => sum + (item.premium ?? 0), 0) };
  }).filter(item => item.members.length > 0);
  const sourceGroups = groups.filter(item => Boolean(item.source)).length;
  const counts = {
    onTrack: results.filter(item => item.focus === 'on-track').length,
    watch: results.filter(item => item.focus === 'watch').length,
    below: results.filter(item => item.focus === 'below').length,
    modelOpen: results.filter(item => item.focus === 'model-open').length,
  };
  const activeFilters = scope.group !== 'all' || scope.market !== 'all' || scope.focus !== 'all' || scope.month !== '2026-09' || scope.snapshot !== 'latest';
  const snapshotLabel = source ? `${months.find(m=>m.value===scope.month)?.label??scope.month} · ${scope.snapshot==='latest'?'Monatsabschluss':'Wochenstand'}` : scope.month === '2026-09' ? (scope.snapshot === 'latest' ? '24.09.2026 · MTD' : '16.09.2026 · MTD') : `${MONTHS.find(item => item.value === scope.month)?.label} · Demo`;

  return <div className="admin-overview admin-dashboard">
    <section className="admin-panel dashboard-command" aria-label="Dashboardfilter">
      <div className="dashboard-command-intro"><span><SlidersHorizontal size={15} /> Analysefenster</span><strong>{snapshotLabel}</strong><small>{source?'Veröffentlichte Werte · Filter wirken auf Kennzahlen und Gruppen.':'Alle Werte fiktiv · Filter wirken auf Kennzahlen und Gruppen.'}</small></div>
      <div className="dashboard-filter-grid">
        <label>Berichtsmonat<AdminSelect ariaLabel="Dashboard-Berichtsmonat" value={scope.month} onChange={value => updateScope({ month: value as DashboardMonth, snapshot: 'latest' })} options={months} /></label>
        <label>Obergruppe<AdminSelect ariaLabel="Dashboard-Obergruppe" value={scope.group} onChange={value => updateScope({ group: value as DashboardScope['group'], market: 'all' })} options={[{ value: 'all', label: 'Alle Obergruppen' }, ...SEC_GROUPS.map(group => ({ value: group.id, label: `${group.id} · ${group.description}` }))]} /></label>
        <label>Markt<AdminSelect ariaLabel="Dashboard-Markt" value={scope.market} onChange={value => updateScope({ market: value })} options={[{ value: 'all', label: 'Alle Märkte' }, ...markets.map(market => ({ value: market, label: market }))]} /></label>
        <label>Leistungsbereich<AdminSelect ariaLabel="Dashboard-Leistungsbereich" value={scope.focus} onChange={value => updateScope({ focus: value as DashboardFocus })} options={FOCUS} /></label>
        <label>Datenstand<AdminSelect ariaLabel="Dashboard-Datenstand" value={scope.snapshot} onChange={value => updateScope({ snapshot: value as DashboardScope['snapshot'] })} disabled={!source&&scope.month !== '2026-09'} options={source?source.snapshots(scope.month):[{ value: 'latest', label: scope.month === '2026-09' ? '24.09. · aktuell' : 'Monatsansicht' }, { value: '2026-09-16', label: '16.09. · früherer MTD' }]} /></label>
        <button className="dashboard-reset" onClick={() => setScope(initialScope)} disabled={!activeFilters} title="Alle Dashboardfilter zurücksetzen"><RotateCcw size={15} /><span>Zurücksetzen</span></button>
      </div>
    </section>

    <section className="dashboard-summary" aria-label="Gefilterte Kennzahlen">
      <div><small>SEC im Ausschnitt</small><strong>{results.length}</strong><span>{source?'Veröffentlichte Datensätze':`von ${MEETING_PEOPLE.length} fiktiven IDs`}</span></div>
      <div><small>Ø Zielerreichung</small><strong>{percent(achievement)}</strong><span>{comparable.length} vergleichbare SEC · ohne ST</span></div>
      <div><small>Ø Softbonus</small><strong>{percent(softbonus)}</strong><span>{source?'Veröffentlichter Qualitätswert · ohne ST':'Demo-Qualitätswert · ohne ST'}</span></div>
      <div><small>Prämien-Summe</small><strong>{financial.length ? `${euro(premium)} €` : '—'}</strong><span>{source?'Hauptprämie · ohne Zusatzprämien':'Hauptprämie · ohne On-top / ST'}</span></div>
    </section>

    <div className="dashboard-main-grid">
      <section className="admin-panel dashboard-performance">
        <header className="dashboard-section-head"><div><span>LEISTUNG IM VERLAUF</span><h2>Monatsentwicklung</h2><p>{source?'Arithmetischer Schnitt der veröffentlichten Monatsabschlüsse.':'Illustrative Demo-Werte, kein Verlauf aus importierten Personenzeilen.'}</p></div><ul className="dashboard-legend" aria-label="Diagrammlegende"><li><i className="sellout" aria-hidden="true" />Ziel</li><li><i className="softbonus" aria-hidden="true" />Softbonus</li></ul></header>
        <div className={'dashboard-chart'+(source?' real-source':'')} role="img" aria-label={`Monatsentwicklung: ${trend.map(item => `${item.month} Ziel ${percent(item.achievement)}, Softbonus ${percent(item.softbonus)}`).join('; ')}`}>
          <div className="dashboard-chart-grid" aria-hidden="true">{chartCeiling?[1,.75,.5,.25,0].map(fraction=><span key={fraction} style={{top:`${(1-fraction)*100}%`}}>{chartCeiling*fraction}%</span>):<><span>100%</span><span>75%</span><span>50%</span></>}</div>
          <div className="dashboard-chart-columns">{trend.map(item => <div className={`dashboard-chart-month ${item.month === scope.month ? 'is-current' : ''}`} key={item.month} title={`${item.month} · Ziel ${percent(item.achievement)} · Softbonus ${percent(item.softbonus)}`}><div className="dashboard-chart-bars"><i className="sellout" style={{ height: scoreHeight(item.achievement,chartCeiling) }} /><i className="softbonus" style={{ height: scoreHeight(item.softbonus,chartCeiling) }} /></div><span>{months.find(month => month.value === item.month)?.label.slice(0, 3)}</span></div>)}</div>
        </div>
        <footer className="dashboard-performance-foot"><div><span>Aktueller Schnitt</span><strong>{percent(achievement)}</strong></div><div><span>Qualitativer Schnitt</span><strong>{percent(softbonus)}</strong></div><button onClick={() => onOpenAnalysis(scope)}>Datensätze ansehen <ArrowUpRight size={15} /></button></footer>
      </section>
      <aside className="admin-panel dashboard-inspector">
        <header className="dashboard-section-head"><div><span>VERTEILUNG</span><h2>Wo Aufmerksamkeit liegt</h2><p>Auf den aktuellen Filter bezogen.</p></div></header>
        <div className="dashboard-status-list">
          {([{ key: 'onTrack', label: 'Beide ≥ 95 %', tone: 'good' }, { key: 'watch', label: '90–94 % Bereich', tone: 'watch' }, { key: 'below', label: 'Ein Wert < 90 %', tone: 'low' }, { key: 'modelOpen', label: 'Modell offen · ST', tone: 'open' }] as const).map(item => <div key={item.key} className={`dashboard-status-row ${item.tone}`}><div><span><i />{item.label}</span><strong>{counts[item.key]}</strong></div><div className="dashboard-status-track"><i style={{ width: `${results.length ? counts[item.key] / results.length * 100 : 0}%` }} /></div></div>)}
        </div>
        <div className="dashboard-inspector-foot"><div><span>Import-Abdeckung</span><strong>{sourceGroups} / {groups.length}</strong></div><p>{source?'Obergruppen mit veröffentlichtem Stand':'Obergruppen mit Demo-/lokalem Stand'} in {months.find(item => item.value === scope.month)?.label}. Ein Importstand ist keine berechnete Auszahlung.</p><button onClick={onOpenImport}>Importstände prüfen <ArrowRight size={15} /></button></div>
      </aside>
    </div>

    <section className="admin-panel dashboard-ledger">
      <header className="dashboard-section-head"><div><span>OBERGRUPPEN</span><h2>Ergebnis- und Quellenlage</h2><p>{source?'Gefilterte SEC je Modell.':'Gefilterte Demo-SEC je Modell.'} Ein Klick öffnet die passende Detailauswertung.</p></div><span className="dashboard-ledger-count">{groups.length} Gruppen</span></header>
      <div className="dashboard-ledger-scroll"><div className="dashboard-ledger-head" aria-hidden="true"><span>Gruppe</span><span>SEC</span><span>Ø Ziel</span><span>Ø Softbonus</span><span>{source?'Hauptprämie':'Prämie · Demo'}</span><span>Importstand</span><span /></div>
      <div className="dashboard-ledger-body">{groups.map(item => <div className="dashboard-ledger-row" key={item.group.id}><span className="dashboard-ledger-group"><b>{item.group.id}</b><span><strong>{item.group.description}</strong><small>{item.group.id === 'ST' ? 'Qualitatives Modell · Geld offen' : item.config ? `Modell ab ${item.config.effective}` : 'Kein KPI-Modell'}</small></span></span><span>{item.members.length}</span><span className="dashboard-ledger-value">{percent(item.achievement)}</span><span>{percent(item.softbonus)}</span><span className="dashboard-ledger-money">{item.group.id === 'ST'&&!source ? 'Modell offen' : item.members.some(m=>m.premium!==null)?`${euro(item.premium)} €`:'—'}</span><span className={`dashboard-source-state ${item.source ? 'is-ready' : ''}`}><i />{item.source ? (item.source.phase === 'MONTH_FINALIZATION' ? 'Closing' : item.source.phase === 'WEEKLY_PROGRESS' ? 'Progress' : 'Targets') : 'Kein Stand'}</span><button onClick={() => onOpenAnalysis({ ...scope, group: item.group.id })} aria-label={`${item.group.id} in der Auswertung öffnen`} title={`${item.group.id} in der Auswertung öffnen`}><ArrowUpRight size={17} /></button></div>)}{!groups.length && <div className="dashboard-empty"><CircleHelp size={19} />{source?'Keine veröffentlichten Datensätze für diese Kombination.':'Keine Demo-Datensätze für diese Kombination.'} Filter zurücksetzen oder einen anderen Bereich wählen.</div>}</div></div>
      <footer className="dashboard-ledger-foot"><span><FileSpreadsheet size={15} /> Datenstand und Modell sind getrennt versioniert.</span><button onClick={() => onOpenConfiguration(scope.group === 'all' ? 'HE' : scope.group)}><Settings2 size={15} /> KPI-Modelle öffnen</button></footer>
    </section>

    <section className="dashboard-operations" aria-label="Nächste Schritte"><div><span>MONATSZYKLUS</span><strong>Targets <ArrowRight size={15} /> Progress <ArrowRight size={15} /> Closing</strong><small>MTD-Snapshots ersetzen frühere Wochenstände; sie werden nicht addiert.</small></div><button onClick={onOpenImport}>Nächsten Stand prüfen <ArrowUpRight size={15} /></button></section>
    <section className="dashboard-open-questions" aria-label="Offene Modellentscheidungen"><span><CircleHelp size={15} /> Fachlich offen</span><p>HE/LH: ASP vs. AV · LH: Softbonus-Untergewichte · ST: Geld- und Jahresmodell. {source?'Nur gelieferte Werte werden angezeigt; offene Regeln werden nicht berechnet.':'Die Demo löst diese Regeln nicht.'}</p></section>
    <p className="overview-disclaimer">{source?'Veröffentlichte Importwerte. Haupt- und Zusatzprämien bleiben getrennt; es erfolgt keine automatische Auszahlung.':'Lokaler Frontend-Prototyp · 23 fiktive Personen · keine produktive Berechnung, Anmeldung, Freigabe oder serverseitige Speicherung.'}</p>
  </div>;
}
