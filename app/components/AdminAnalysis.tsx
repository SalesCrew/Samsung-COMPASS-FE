'use client';

import { useState } from 'react';
import { Search, ShieldCheck, SlidersHorizontal, TrendingUp, WalletCards } from 'lucide-react';
import { GROUP_DEMO } from '../lib/demo';
import { SEC_GROUPS } from '../lib/groups';
import { AdminSelect } from './AdminSelect';
import { AdminMonthPicker } from './AdminTemporalPicker';
import { MEETING_PEOPLE } from '../lib/adminDemo';
import { initialMetrics } from '../lib/admin';
import { average, dashboardResults, demoDashboardResult, type DashboardFocus, type DashboardMonth, type DashboardScope } from '../lib/adminDashboard';
import type { LiveDashboardSource } from '../lib/adminLiveData';

const euro=(value:number)=>new Intl.NumberFormat('de-AT',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
const PERSONS = MEETING_PEOPLE;

export function AdminAnalysis({ initialScope, source }: { initialScope?: DashboardScope; source?: LiveDashboardSource }) {
  const [group, setGroup] = useState(initialScope?.group ?? 'all');
  const [market, setMarket] = useState(initialScope?.market ?? 'all');
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState<DashboardMonth>(initialScope?.month ?? source?.initialMonth??source?.months[0]?.value ?? '2026-09');
  const [snapshot, setSnapshot] = useState<DashboardScope['snapshot']>(initialScope?.snapshot ?? 'latest');
  const [focus, setFocus] = useState<DashboardFocus>(initialScope?.focus ?? 'all');
  const [selected, setSelected] = useState<string | null>(null);
  const rows = dashboardResults({ group, market, month, snapshot, focus },source).filter(item => (item.person.id+' '+(item.name??'')).toLowerCase().includes(search.trim().toLowerCase()));
  const selectedResult = rows.find(item => (item.recordId??item.person.id) === selected) ?? rows[0];
  const selectedPerson = selectedResult?.person;
  const achievementAverage = average(rows.map(item => item.achievement));
  const eligible = rows.filter(item => item.premium !== null);
  const premium = eligible.reduce((sum, item) => sum + (item.premium ?? 0), 0);
  const availableMarkets = [...new Set((source?.people??PERSONS).filter(person => group === 'all' || person.group === group).map(person => person.market))];
  const detailMetrics = selectedPerson ? initialMetrics(selectedPerson.group, 'full') : [];
  const snapshotLabel = source?`${month} · ${source.snapshots(month).find(s=>s.value===snapshot)?.label??snapshot}`:month === '2026-09' ? `${snapshot === 'latest' ? '24' : '16'}.09.2026 · vorläufig, MTD` : `${month} · fiktive Monatsansicht`;
  const personResult = source?selectedResult:selectedPerson ? demoDashboardResult(selectedPerson, { month, snapshot }) : null;
  return <div className="admin-analysis-page">
    <section className="admin-panel analysis-filter-panel">
      <header className="panel-heading"><div><span>Analysebereich</span><h2>Personen, Märkte & Agenturschnitt</h2><p>{source?'Veröffentlichte Werte in deinem Zuständigkeitsbereich.':'Filter wirken nur auf die synthetische Vorschau.'}</p></div><SlidersHorizontal size={19} /></header>
      <div className="admin-form-grid admin-analysis-filters">
        <label>Gruppe<AdminSelect ariaLabel="Gruppe" value={group} onChange={value => { setGroup(value as DashboardScope['group']); setMarket('all'); setSelected(null); }} options={[{ value: 'all', label: 'Alle Gruppen' }, ...SEC_GROUPS.map(item => ({ value: item.id, label: `${item.id} · ${item.description}` }))]} /></label>
        <label>Markt<AdminSelect ariaLabel="Markt" value={market} onChange={value => { setMarket(value); setSelected(null); }} options={[{ value: 'all', label: 'Alle Märkte' }, ...availableMarkets.map(value => ({ value, label: value }))]} /></label>
        <label>Berichtsmonat{source?<AdminSelect ariaLabel="Berichtsmonat" value={month} onChange={value=>{setMonth(value);setSnapshot('latest');setSelected(null);}} options={source.months}/>:<AdminMonthPicker value={month} onChange={value => { setMonth(value as DashboardMonth); setSnapshot('latest'); setSelected(null); }} ariaLabel="Berichtsmonat" min="2026-04" max="2026-09" />}</label>
        <label>Datenstand<AdminSelect ariaLabel="Analyse-Datenstand" value={snapshot} onChange={value => { setSnapshot(value as DashboardScope['snapshot']); setSelected(null); }} disabled={!source&&month !== '2026-09'} options={source?source.snapshots(month):[{ value: 'latest', label: month === '2026-09' ? '24.09. · aktuell' : 'Monatsansicht' }, { value: '2026-09-16', label: '16.09. · früherer MTD' }]} /></label>
        <label>Leistungsbereich<AdminSelect ariaLabel="Analyse-Leistungsbereich" value={focus} onChange={value => { setFocus(value as DashboardFocus); setSelected(null); }} options={[{ value: 'all', label: 'Alle Bereiche' }, { value: 'on-track', label: 'Beide ≥ 95 %' }, { value: 'watch', label: '90–94 % Bereich' }, { value: 'below', label: 'Mindestens ein Wert < 90 %' }, { value: 'model-open', label: 'Modell offen · ST' }]} /></label>
        <label>SEC suchen<span className="admin-search"><Search size={16} /><input value={search} onChange={event => { setSearch(event.target.value); setSelected(null); }} placeholder={source?'SEC-ID oder Name':'DEMO 001 …'} /></span></label>
      </div>
      <p className="admin-analysis-source">{snapshotLabel}. {source?'Veröffentlichte Importwerte; Haupt- und Zusatzprämien bleiben getrennt.':'Frei erfundene Ergebniswerte; keine berechnete oder freigegebene Prämie.'} Wochenstände werden nicht addiert.</p>
    </section>

    <section className="analysis-metrics" aria-label="Gefilterte Kennzahlen">
      <div><span className="metric-icon"><ShieldCheck size={18} /></span><small>Gefilterte SEC</small><strong>{rows.length}</strong><p>{source?'Veröffentlichte Datensätze':'Vollständig fiktive Datensätze'}</p></div>
      <div><span className="metric-icon"><TrendingUp size={18} /></span><small>Ø Zielerreichung</small><strong>{achievementAverage === null ? '—' : `${achievementAverage.toLocaleString('de-AT', { maximumFractionDigits: 1 })}%`}</strong><p>{source?'Arithmetischer Schnitt · ohne ST':'Arithmetischer Demo-Schnitt · ohne ST'}</p></div>
      <div><span className="metric-icon"><WalletCards size={18} /></span><small>{source?'Hauptprämien-Summe':'Prämien-Summe · Demo'}</small><strong>{eligible.length ? `${euro(premium)} €` : '—'}</strong><p>{source?'Bekannte Hauptprämien · ohne Zusatzprämien':'Hauptprämie, ohne On-top oder ST'}</p></div>
    </section>

    <div className={`analysis-workspace${rows.length <= 6 ? ' is-short-list' : ''}`}>
      <section className="admin-panel analysis-table-panel">
        <header className="panel-heading compact"><div><span>Ergebnisse</span><h2>{rows.length} passende Datensätze</h2></div>{!source&&<small className="table-demo-label">DEMO</small>}</header>
        <div className="admin-analysis-table"><div className="admin-analysis-head"><span>SEC</span><span>Markt</span><span>Gruppe</span><span>Ziel</span><span>Softbonus</span></div>{rows.map(item => <button key={item.recordId??item.person.id} className={(selectedResult?.recordId??selectedPerson?.id) === (item.recordId??item.person.id) ? 'active' : ''} onClick={() => setSelected(item.recordId??item.person.id)}><strong>{item.name||item.person.id}</strong><span>{item.person.market}</span><span><i className={`group-chip group-${item.person.group.toLowerCase()}`}>{item.person.group}</i></span><b>{item.achievement === null ? '—' : `${item.achievement}%`}</b><span>{item.softbonus === null ? '—' : `${item.softbonus}%`}</span></button>)}{!rows.length && <div className="analysis-empty">{source?'Keine veröffentlichten Datensätze für diese Filter.':'Kein Demo-Datensatz entspricht diesen Filtern.'}</div>}</div>
      </section>

      <aside className="admin-panel analysis-detail-panel">
        <header className="analysis-person-head"><span>Ausgewählter Datensatz</span>{selectedPerson ? <><h2>{selectedResult?.name||selectedPerson.id}</h2><p>{selectedPerson.market} · {selectedPerson.group} · {month}</p></> : <h2>Person wählen</h2>}</header>
        {selectedPerson && <><div className="analysis-detail-values"><div><span>{source?'Zielerreichung':selectedPerson.group === 'ST' ? 'Qualitativer Stand' : 'Zielerreichung · Demo'}</span><strong>{source?(personResult?.achievement===null?'—':`${personResult?.achievement}%`):selectedPerson.group === 'ST' ? `${GROUP_DEMO.ST.overall + selectedPerson.shift}%` : `${personResult?.achievement}%`}</strong></div><div><span>Softbonus</span><strong>{personResult?.softbonus === null ? 'Modell offen' : `${personResult?.softbonus}%`}</strong></div><div><span>{source?'Hauptprämie':'Hauptprämie · Demo'}</span><strong>{personResult?.premium === null ? 'Modell offen' : `${euro(personResult?.premium ?? 0)} €`}</strong></div><div><span>Rolle</span><strong>{SEC_GROUPS.find(item => item.id === selectedPerson.group)?.description}</strong></div></div>
          <section className="analysis-kpi-detail" aria-label="KPI-Werte"><h3>{source?'Veröffentlichte Kennzahlen':selectedPerson.group === 'ST' ? 'Qualitative Kriterien' : 'KPI-Beispielwerte'}</h3><p>{source?'Werte des gewählten Datenstands. Fehlende Angaben bleiben offen.':'Ziel/Ist frei erfunden. Gewichte aus dem bestehenden Modell; kein Gesamtwert daraus abgeleitet.'}</p>{source?selectedResult?.metrics?.map(metric=><div key={metric.key}><span>{metric.label}<small>{metric.weight===null?'Gewicht offen':`${metric.weight}% Gewicht`}</small></span><strong style={{color:metric.achievement===null?undefined:metric.achievement>=90?'#04B87A':'#b45200'}}>{metric.achievement===null?'—':`${metric.achievement}%`}<small>{metric.actual??'—'} / {metric.target??'—'} {metric.unit}</small></strong></div>):detailMetrics.map(metric => <div key={metric.id}><span>{metric.label}<small>{metric.weight ?? 'Offen'} % Gewicht</small></span><strong>{metric.actual} / {metric.target}<small>{metric.unit}</small></strong></div>)}</section>
        </>}
        <footer className="analysis-privacy"><ShieldCheck size={16} /><p>{source?'Rollen und Datensätze sind serverseitig geschützt. Du siehst nur deinen freigegebenen Bereich.':'Produktiv werden Rollen und Datensätze serverseitig geschützt. Fremde Rohdaten erreichen kein SEC-Gerät.'}</p></footer>
      </aside>
    </div>
  </div>;
}
