'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Check, ChevronRight, CircleDot, Columns3, ExternalLink, FileSpreadsheet, History, LayoutDashboard, Settings2, ShieldCheck, SlidersHorizontal, UploadCloud, UsersRound, X } from 'lucide-react';
import { DA_SETTINGS, SEC_GROUPS, type DASetting, type SECGroup } from '../lib/groups';
import {
  IMPORT_DATASETS,
  defaultDatasets,
  defaultSplitCategories,
  initialMetrics,
  inspectWorkbook,
  suggestColumnMappings,
  weightChecks,
  type AdminMetric,
  type ConfigVersion,
  type ImportDatasetId,
  type ImportPhase,
  type ImportVersion,
  type SheetPreview,
  type SourceColumnMapping,
  type SplitCategory,
} from '../lib/admin';
import { ColumnMappingWorkspace } from './ColumnMappingWorkspace';
import { ClosingMappingWorkspace, ClosingImportPreview } from './ClosingMappingWorkspace';
import { closingMappings, mergeClosingMappings, closingMappingError, closingTemplate, detectClosingGroup, excelMonth, prepareClosing, type ClosingResult } from '../lib/closingImport';
import { isPivotSheet, preferredSheet } from '../lib/workbook';
import { AdminAnalysis } from './AdminAnalysis';
import { AdminOverview } from './AdminOverview';
import { AdminMetricEditor } from './AdminMetricEditor';
import { AdminHistory } from './AdminHistory';
import { MEETING_CONFIGS, MEETING_IMPORTS, MEETING_PEOPLE, localRecords, meetingWorkbook, mergeMeetingData } from '../lib/adminDemo';
import { AdminSelect } from './AdminSelect';
import { ImportIdentityReview, type ImportIdentityMatch, type ImportPersonOption } from './ImportIdentityReview';
import { AdminMonthPicker, AdminDatePicker } from './AdminTemporalPicker';
import type { DashboardScope } from '../lib/adminDashboard';
import type { LiveDashboardSource } from '../lib/adminLiveData';
import './admin.css';

type AdminTab = 'overview' | 'analysis' | 'import' | 'configuration' | 'history' | 'accounts' | 'privacy';
export type AdminRemote={source:LiveDashboardSource;configs:ConfigVersion[];imports:ImportVersion[];departments:SECGroup['id'][];accounts:ReactNode;privacy:ReactNode;refresh:()=>Promise<void>;request:<T>(path:string,body?:unknown,options?:RequestInit)=>Promise<T>};
type RemoteValidation={issues:{row:number;column?:string;field?:string;message:string}[];count:number;otherMonths:number;specialValues:number;mappings:SourceColumnMapping[];identityMatches?:ImportIdentityMatch[];people?:ImportPersonOption[]};
const CONFIG_KEY = 'sec-admin-config-v1';
const IMPORT_KEY = 'sec-admin-import-v2';
const INITIAL_DEMO_SOURCE = { sheet: closingTemplate('HE'), mappings: closingMappings(closingTemplate('HE'), 'HE') };
const PHASES: { value: ImportPhase; label: string; explanation: string }[] = [
  { value: 'TARGET_INITIALIZATION', label: 'Monatsstart · Targets', explanation: 'Neue Zielbasis; Actuals dürfen noch fehlen.' },
  { value: 'WEEKLY_PROGRESS', label: 'Weekly Progress', explanation: 'Kumulierter Monatsstand, nicht addierbare Wochenwerte.' },
  { value: 'MONTH_FINALIZATION', label: 'Monatsabschluss', explanation: 'Tracker und Closing gegebenenfalls getrennt prüfen.' },
];
const freshId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const localDate = () => new Date().toISOString().slice(0, 10);
const parseStored = <T,>(key: string): T[] => { try { const value = JSON.parse(localStorage.getItem(key) ?? '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };

export function AdminWorkbench({remote,onPasswordChange}:{remote?:AdminRemote;onPasswordChange?:()=>void}={}) {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [analysisScope, setAnalysisScope] = useState<DashboardScope | undefined>();
  const [group, setGroup] = useState<SECGroup['id']>(remote?.departments[0]??'HE');
  const [setting, setSetting] = useState<DASetting>('full');
  const [demoConfigs, setConfigs] = useState<ConfigVersion[]>(() => remote?[]:structuredClone(MEETING_CONFIGS));
  const [demoImports, setImports] = useState<ImportVersion[]>(() => remote?[]:structuredClone(MEETING_IMPORTS));
  const configs=remote?.configs??demoConfigs;
  const imports=remote?.imports??demoImports;
  const allowedGroups=SEC_GROUPS.filter(g=>!remote||remote.departments.includes(g.id));
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<AdminMetric[]>(() => remote?initialMetrics(remote.departments[0],'full'):structuredClone(MEETING_CONFIGS.at(-1)!.metrics));
  const [effective, setEffective] = useState(remote?localDate():'2026-09-15');
  const [versionNote, setVersionNote] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [demoSource, setDemoSource] = useState(!remote);
  const [sheets, setSheets] = useState<SheetPreview[]>(() => remote?[]:[structuredClone(INITIAL_DEMO_SOURCE.sheet)]);
  const [sheetName, setSheetName] = useState(remote?'':INITIAL_DEMO_SOURCE.sheet.name);
  const [importGroup, setImportGroup] = useState<SECGroup['id']>(remote?.departments[0]??'HE');
  const [importSetting, setImportSetting] = useState<DASetting>('full');
  const [importMonth, setImportMonth] = useState(remote?localDate().slice(0,7):'2026-09');
  const [phase, setPhase] = useState<ImportPhase>('MONTH_FINALIZATION');
  const [subtype, setSubtype] = useState('Monthly Closing');
  const [columnMappings, setColumnMappings] = useState<SourceColumnMapping[]>(() => remote?[]:structuredClone(INITIAL_DEMO_SOURCE.mappings));
  const [datasets, setDatasets] = useState<ImportDatasetId[]>(() => defaultDatasets('MONTH_FINALIZATION', 'Monthly Closing', 'HE'));
  const [splitCategories, setSplitCategories] = useState<SplitCategory[]>(() => defaultSplitCategories('HE'));
  const [error, setError] = useState('');
  const [readingFile, setReadingFile] = useState(false);
  const [previewId,setPreviewId]=useState('');
  const [asOf,setAsOf]=useState(localDate());
  const [remoteCheck,setRemoteCheck]=useState<RemoteValidation|null>(null);
  const [personMatches,setPersonMatches]=useState<Record<string,string>>({});
  const [staged,setStaged]=useState('');
  const [busy,setBusy]=useState(false);
  const fileRead = useRef(0);
  const [closingBatches, setClosingBatches] = useState<{ signature: string; result: ClosingResult }[]>([]);
  useEffect(() => { if(remote)return; const frame = requestAnimationFrame(() => { const saved = mergeMeetingData(MEETING_CONFIGS, parseStored<ConfigVersion>(CONFIG_KEY)); setConfigs(saved); setImports(mergeMeetingData(MEETING_IMPORTS, parseStored<ImportVersion>(IMPORT_KEY))); const latest = saved.filter(item => item.group === 'HE').at(-1); if (latest) { setDraft(structuredClone(latest.metrics)); setSelectedVersion(latest.id); setEffective(latest.effective); setColumnMappings(closingMappings(INITIAL_DEMO_SOURCE.sheet, 'HE', latest.metrics)); } setLoaded(true); }); return () => cancelAnimationFrame(frame); }, [remote]);
  useEffect(() => { if (loaded&&!remote) { try { localStorage.setItem(CONFIG_KEY, JSON.stringify(localRecords(configs))); } catch { /* Private mode can disable storage. */ } } }, [configs, loaded, remote]);
  useEffect(() => { if (loaded&&!remote) { try { localStorage.setItem(IMPORT_KEY, JSON.stringify(localRecords(imports))); } catch { /* Preview remains usable for this session. */ } } }, [imports, loaded, remote]);
  const versions = useMemo(() => configs.filter(item => item.group === group && (group !== 'DA' || item.setting === setting)).sort((a, b) => b.saved.localeCompare(a.saved)), [configs, group, setting]);
  const checks = weightChecks(draft);
  const validWeights = checks.every(item => item.total === 100 && !item.unresolved);
  const selectedSheet = sheets.find(sheet => sheet.name === sheetName);
  const closingMode = Boolean(selectedSheet && isPivotSheet(selectedSheet.name) && phase === 'MONTH_FINALIZATION' && subtype === 'Monthly Closing');
  const sourceName = demoSource ? `DEMO_${importGroup}_${importMonth}.xlsx` : file?.name;
  const sameMonthImports = imports.filter(item => item.group === importGroup && item.month === importMonth && item.status === 'released');
  const importMetrics = useMemo(() => {
    const latest = configs.filter(item => item.group === importGroup && (importGroup !== 'DA' || item.setting === importSetting)).at(-1);
    return latest?.metrics ?? initialMetrics(importGroup, importSetting);
  }, [configs, importGroup, importSetting]);
  const closingPreview = useMemo(() => !remote && !demoSource && closingMode && selectedSheet ? prepareClosing(selectedSheet, importGroup, columnMappings, importMonth, importMetrics) : undefined,
    [remote, demoSource, closingMode, selectedSheet, importGroup, columnMappings, importMonth, importMetrics]);
  const closingSignature = closingPreview ? JSON.stringify([importGroup, importMonth, closingPreview.records]) : '';
  const importedClosing = closingBatches.find(batch => batch.signature === closingSignature);
  const mappedColumns = columnMappings.filter(item => item.dataset !== 'ignore' && item.field);
  const unresolvedColumns = columnMappings.filter(item => item.dataset !== 'ignore' && !item.field);
  const duplicateTargets = [...new Set(mappedColumns.map(item => `${item.dataset}.${item.field}`).filter((value, index, values) => values.indexOf(value) !== index))];
  function switchConfig(nextGroup: SECGroup['id'], nextSetting: DASetting = setting) {
    if(remote&&nextGroup!=='DA')nextSetting='full';
    setGroup(nextGroup); setSetting(nextSetting); setSelectedVersion(null);
    const latest = configs.filter(item => item.group === nextGroup && (nextGroup !== 'DA' || item.setting === nextSetting)).at(-1);
    setDraft(latest ? structuredClone(latest.metrics) : initialMetrics(nextGroup, nextSetting));
    setEffective(latest?.effective ?? localDate());
    setSelectedVersion(latest?.id ?? null);
    setVersionNote('');
    setNotice('');
  }
  function updateMetric(id: string, patch: Partial<AdminMetric>) { setDraft(current => current.map(item => item.id === id ? { ...item, ...patch } : item)); }
  async function saveConfig() {
    if (!validWeights) { setNotice('Aktive Gewichte müssen je KPI-Block genau 100 % ergeben. Unbekannte Gewichte zuerst klären.'); return; }
    if (!effective) { setNotice('Bitte ein Gültigkeitsdatum eingeben.'); return; }
    if(remote){setBusy(true);try{await remote.request('/admin/configurations',{department:group,setting,effectiveFrom:effective,definition:{metrics:draft},note:versionNote.trim()});await remote.refresh();setNotice(`Konfiguration gespeichert · gültig ab ${effective}.`);setVersionNote('');}catch(e){setNotice(e instanceof Error?e.message:'Speichern fehlgeschlagen.');}finally{setBusy(false);}return;}
    const saved = new Date().toISOString();
    const version: ConfigVersion = { id: freshId(), origin: 'local', group, setting, effective, saved, note: versionNote.trim() || 'Konfiguration aktualisiert', metrics: structuredClone(draft) };
    if (closingMode && selectedSheet && importGroup === group && (group !== 'DA' || importSetting === setting)) setColumnMappings(current => mergeClosingMappings(selectedSheet, group, draft, current));
    setConfigs(current => [...current, version]); setSelectedVersion(version.id); setVersionNote(''); setNotice(`Version ${versions.length + 1} lokal gespeichert · gültig ab ${effective}.`);
  }
  async function openFile(next: File | undefined) {
    if (!next) return;
    const request = ++fileRead.current;
    setReadingFile(true);
    setFile(next); setDemoSource(false); setSheets([]); setSheetName(''); setError(''); setNotice(''); setColumnMappings([]);
    try {
      if(remote){
        const result=await remote.request<{previewId:string;detectedGroup:SECGroup['id']|null;preferredSheet:string;sourceMonths:string[];sourceAsOf:string|null;sheets:SheetPreview[]}>('/imports/preview',undefined,{method:'POST',headers:{'Content-Type':'application/octet-stream','X-File-Name':encodeURIComponent(next.name)},body:next});
        if(request!==fileRead.current)return;
        const nextGroup=result.detectedGroup??remote.departments[0];const chosen=result.sheets.find(v=>v.name===result.preferredSheet)!;
        const month=result.sourceMonths.at(-1)??new Date().toISOString().slice(0,7);const date=result.sourceAsOf??month+'-'+new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate();
        const nextPhase=isPivotSheet(chosen.name)?'MONTH_FINALIZATION':'WEEKLY_PROGRESS';
        setPreviewId(result.previewId);setPersonMatches({});setSheets(result.sheets);setSheetName(chosen.name);setImportGroup(nextGroup);setImportMonth(month);setAsOf(date);setPhase(nextPhase);setSubtype(nextPhase==='MONTH_FINALIZATION'?'Monthly Closing':'Progress-Tracker');
        const checked=await remote.request<RemoteValidation>('/imports/'+result.previewId+'/validate',{group:nextGroup,setting:importSetting,month,asOf:date,phase:nextPhase,sheet:chosen.name});
        if(request!==fileRead.current)return;setColumnMappings(checked.mappings);setRemoteCheck(checked);setStaged('');return;
      }
      const parsed = await inspectWorkbook(next);
      if (request !== fileRead.current) return;
      const chosen = preferredSheet(parsed);
      const nextGroup = chosen ? detectClosingGroup(next.name, chosen) ?? importGroup : importGroup;
      const pivot = chosen && isPivotSheet(chosen.name);
      const configured = configs.filter(item => item.group === nextGroup && (nextGroup !== 'DA' || item.setting === importSetting)).at(-1)?.metrics ?? initialMetrics(nextGroup, importSetting);
      const mapped = chosen ? pivot ? closingMappings(chosen, nextGroup, configured) : suggestColumnMappings(chosen, nextGroup, importSetting) : [];
      setSheets(parsed);
      setSheetName(chosen?.name ?? '');
      setImportGroup(nextGroup);
      setColumnMappings(mapped);
      if (pivot) {
        setPhase('MONTH_FINALIZATION'); setSubtype('Monthly Closing');
        setDatasets(defaultDatasets('MONTH_FINALIZATION', 'Monthly Closing', nextGroup));
        setSplitCategories(defaultSplitCategories(nextGroup));
        const monthColumn = mapped.find(item => item.field === 'snapshot.reportMonth')?.column ?? '';
        const latestMonth = (chosen.data ?? []).map(row => excelMonth(row.cells[monthColumn]?.value ?? null, chosen.date1904)).filter((month): month is string => Boolean(month)).sort().at(-1);
        if (latestMonth) setImportMonth(latestMonth);
      }
      if (!parsed.length) setError('Keine Arbeitsblätter gefunden.');
    }
    catch (reason) { if (request === fileRead.current) setError(reason instanceof Error ? reason.message : 'Die Datei konnte nicht gelesen werden.'); }
    finally { if (request === fileRead.current) setReadingFile(false); }
  }
  function resetImportModel(nextGroup: SECGroup['id'], nextSetting: DASetting, nextPhase = phase, nextSubtype = subtype) {
    if(remote&&nextGroup!=='DA'){nextSetting='full';setImportSetting('full');}
    const configured = configs.filter(item => item.group === nextGroup && (nextGroup !== 'DA' || item.setting === nextSetting)).at(-1)?.metrics ?? initialMetrics(nextGroup, nextSetting);
    const nextDatasets = defaultDatasets(nextPhase, nextSubtype, nextGroup);
    setDatasets(nextDatasets);
    setSplitCategories(defaultSplitCategories(nextGroup));
    if (demoSource) {
      const template = closingTemplate(nextGroup);
      const source = nextPhase === 'MONTH_FINALIZATION' && nextSubtype === 'Monthly Closing' ? { sheet: template, mappings: closingMappings(template, nextGroup, configured) } : meetingWorkbook(nextGroup, nextSetting, nextPhase);
      setSheets([source.sheet]); setSheetName(source.sheet.name); setColumnMappings(source.mappings);
    } else if (selectedSheet) {
      const suggested = isPivotSheet(selectedSheet.name) && nextPhase === 'MONTH_FINALIZATION' && nextSubtype === 'Monthly Closing' ? closingMappings(selectedSheet, nextGroup, configured)
        : suggestColumnMappings(selectedSheet, nextGroup, nextSetting, configured).map(item => item.dataset !== 'ignore' && !nextDatasets.includes(item.dataset) ? { ...item, dataset: 'ignore' as const, field: '', required: false } : item);
      setColumnMappings(suggested);
    }
    setError('');
  }
  function loadDemoImport() {
    fileRead.current++; setReadingFile(false);
    setFile(null); setDemoSource(true); setImportGroup('HE'); setImportSetting('full');
    setImportMonth('2026-09'); setPhase('MONTH_FINALIZATION'); setSubtype('Monthly Closing');
    setSheets([structuredClone(INITIAL_DEMO_SOURCE.sheet)]); setSheetName(INITIAL_DEMO_SOURCE.sheet.name);
    setColumnMappings(closingMappings(INITIAL_DEMO_SOURCE.sheet, 'HE', configs.filter(item => item.group === 'HE').at(-1)?.metrics));
    setDatasets(defaultDatasets('MONTH_FINALIZATION', 'Monthly Closing', 'HE')); setSplitCategories(defaultSplitCategories('HE'));
    setError(''); setNotice('HE-Pivot-Vorlage geladen. Originale Feldnamen, keine Datei oder Personendaten eingelesen.'); setTab('import');
  }
  function validateImport() {
    if(remote)return !previewId?'Excel-Datei wählen.':!asOf?'Datenstand wählen.':remoteCheck?.issues.length?`${remoteCheck.issues.length} Datenfehler beheben.`:'';
    if (!sourceName || !selectedSheet) return 'Bitte zuerst eine Excel-Datei mit einem Arbeitsblatt auswählen.';
    if (phase === 'MONTH_FINALIZATION' && subtype === 'Monthly Closing' && !isPivotSheet(selectedSheet.name)) return 'Für den Monthly Closing-Import bitte Pivot Liste auswählen.';
    if (closingMode) {
      const mappingError = closingMappingError(selectedSheet, importGroup, columnMappings, importMetrics);
      if (mappingError) return mappingError;
      if (demoSource) return 'Excel-Datei wählen, um echte Zellwerte lokal einzulesen.';
      if (closingPreview?.issues.length) return `${closingPreview.issues.length} Datenfehler vor dem Import beheben.`;
      if (!closingPreview?.records.length) return 'Keine Datensätze für diesen Berichtsmonat vorhanden.';
      return '';
    }
    if (columnMappings.length !== selectedSheet.columns.length) return 'Für jede Excel-Spalte muss eine Zuordnung oder „Ignorieren“ gespeichert sein.';
    if (unresolvedColumns.length) return `${unresolvedColumns.length} aktivierte Spalten haben noch kein Zielfeld.`;
    if (duplicateTargets.length) return `Mehrere Quellspalten zeigen auf dasselbe Zielfeld: ${duplicateTargets.join(', ')}.`;
    const fields = new Set(mappedColumns.map(item => item.field));
    const hasPerson = fields.has('person.externalId') || fields.has('person.internalId');
    const hasAssignment = fields.has('assignment.market') || fields.has('assignment.store');
    if (!hasPerson || !hasAssignment) return 'SEC-ID und Markt oder Store müssen vor der Freigabe zugeordnet sein.';
    const hasTarget = mappedColumns.some(item => item.dataset === 'sellout' && item.field.endsWith('.target'));
    const hasActual = mappedColumns.some(item => (item.dataset === 'sellout' || item.dataset === 'softbonus') && (item.field.endsWith('.actual') || item.field.endsWith('.achievement') || item.field === 'softbonus.overall'));
    if (phase === 'TARGET_INITIALIZATION' && importGroup !== 'ST' && !hasTarget) return 'Die Target-Initialisierung braucht mindestens eine KPI-Target-Spalte.';
    if (phase !== 'TARGET_INITIALIZATION' && !hasActual) return 'Ein Progress- oder Closing-Stand braucht mindestens einen Ist-, T/A- oder Softbonus-Wert.';
    if (!splitCategories.length) return 'Wähle mindestens eine Kategorie für den Datensatz-Split.';
    return '';
  }
  const remoteSignature=JSON.stringify([previewId,importGroup,importSetting,importMonth,asOf,phase,sheetName,columnMappings,personMatches]);
  const[checkedSignature,setCheckedSignature]=useState('');
  function remoteContext(){return{group:importGroup,setting:importSetting,month:importMonth,asOf,phase,sheet:sheetName,mappings:columnMappings,personMatches};}
  async function checkRemote(){if(!remote||!previewId)return;setBusy(true);setError('');setStaged('');try{const check=await remote.request<RemoteValidation>('/imports/'+previewId+'/validate',remoteContext());setRemoteCheck(check);setCheckedSignature(remoteSignature);setNotice(`${check.count} passende Datensätze · ${check.otherMonths} andere Monate · ${check.issues.length} Fehler.`);}catch(e){setError(e instanceof Error?e.message:'Prüfung fehlgeschlagen.');}finally{setBusy(false);}}
  async function releaseRemote(){if(!remote||!previewId)return;setBusy(true);setError('');try{const check=await remote.request<RemoteValidation>('/imports/'+previewId+'/validate',remoteContext());setRemoteCheck(check);setCheckedSignature(remoteSignature);if(check.issues.length||!check.count)throw new Error('Datenfehler vor der Veröffentlichung beheben.');const result=await remote.request<{import:{id:string}}>('/imports/'+previewId+'/stage',remoteContext());setStaged(result.import.id);await remote.refresh();setNotice(`${check.count} Datensätze als Entwurf gespeichert. Veröffentlichung separat bestätigen.`);}catch(e){setError(e instanceof Error?e.message:'Import fehlgeschlagen.');}finally{setBusy(false);}}
  async function publishRemote(){if(!remote||!staged||checkedSignature!==remoteSignature)return;setBusy(true);setError('');try{await remote.request('/imports/'+staged+'/publish',{});await remote.refresh();setStaged('');setNotice('Veröffentlicht. Der persönliche Datenstand wird automatisch aktualisiert.');}catch(e){setError(e instanceof Error?e.message:'Veröffentlichung fehlgeschlagen.');}finally{setBusy(false);}}
  function releaseImport() {
    const validationError = validateImport();
    if (validationError || !sourceName || !selectedSheet) { setError(validationError); return; }
    if (closingMode && closingPreview) {
      if (importedClosing) { setNotice('Dieser Datenstand ist bereits lokal importiert.'); return; }
      setClosingBatches(current => [...current, { signature: closingSignature, result: structuredClone(closingPreview) }]);
      const active = columnMappings.filter(item => item.dataset !== 'ignore');
      const version: ImportVersion = { id: freshId(), origin: 'local', filename: sourceName, group: importGroup, month: importMonth, phase, subtype, sheet: sheetName,
        saved: new Date().toISOString(), status: 'released', fields: active.map(item => `${item.column} → ${item.sourceLabel}`), mapping: Object.fromEntries(active.map(item => [item.column, item.field])),
        columnMappings: structuredClone(columnMappings), datasets: [...new Set(active.map(item => item.dataset as ImportDatasetId))], splitCategories: [...splitCategories],
        changed: [...new Set(active.map(item => item.sourceSection ?? ''))], carried: [], closingSummary: { records: closingPreview.records.length, otherMonths: closingPreview.otherMonths, warnings: closingPreview.specialValues } };
      setImports(current => [...current, version]); setError('');
      setNotice(`${closingPreview.records.length} Datensätze für ${importGroup} · ${importMonth} lokal importiert.`);
      return;
    }
    const previous = sameMonthImports.at(-1);
    const fields = mappedColumns.map(item => `${item.column} → ${item.dataset}.${item.field}`);
    const columnMapping = Object.fromEntries(columnMappings.map(item => [item.column, item.dataset === 'ignore' ? 'ignore' : `${item.dataset}.${item.field}`]));
    const changed = datasets.map(dataset => IMPORT_DATASETS.find(item => item.id === dataset)?.label ?? dataset);
    const previousDatasets = previous?.datasets ?? [];
    const version: ImportVersion = { id: freshId(), origin: 'local', filename: sourceName, group: importGroup, month: importMonth, phase, subtype, sheet: sheetName,
      saved: new Date().toISOString(), status: 'released', fields, mapping: columnMapping, columnMappings: structuredClone(columnMappings), datasets: [...datasets], splitCategories: [...splitCategories], changed,
      carried: previousDatasets.filter(dataset => !datasets.includes(dataset)).map(dataset => IMPORT_DATASETS.find(item => item.id === dataset)?.label ?? dataset), };
    setImports(current => [...current, version]); setNotice(`Lokale Demo-Version ${sameMonthImports.length + 1} freigegeben. Kein Server-Import.`);
    setError(''); setTab('history');
  }
  function exportJson() {
    const blob = new Blob([JSON.stringify({ schema: remote?'sec-admin-metadata/v1':'sec-admin-preview/v2', ...(!remote?{demo:{fictional:true,referenceDate:'2026-09-24',people:MEETING_PEOPLE}}:{}), configs, imports }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'sec-admin-preview.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const label = SEC_GROUPS.find(item => item.id === group)?.description ?? group;
  const pageMeta = {
    overview: { section: 'Operations Desk', title: 'Übersicht', description: 'Der aktuelle Arbeitsstand für Daten, Modelle und Freigaben.', index: '01' },
    analysis: { section: 'Agenturansicht', title: 'Auswertung', description: 'Veröffentlichte Personen- und Marktwerte vergleichen und prüfen.', index: '02' },
    import: { section: 'Data Pipeline', title: 'Excel-Import', description: 'Quelle einordnen, Spalten verbindlich zuordnen und den nächsten Stand prüfen.', index: '03' },
    configuration: { section: 'Model Studio', title: 'KPI-Konfiguration', description: 'KPI-Modelle bearbeiten, Gewichte prüfen und mit Gültigkeit versionieren.', index: '04' },
    accounts:{section:'Zugänge',title:'Konten & Rechte',description:'Zugänge, Zuordnungen und Rollen verwalten.',index:'06'},
    privacy:{section:'Datenschutz',title:'Datenschutz & Sicherheit',description:'Anfragen, Aufbewahrung und Zugriffsschutz bearbeiten.',index:'07'},
    history: { section: 'Audit Ledger', title: 'Versionen & Verlauf', description: 'Freigaben und Konfigurationsänderungen lückenlos nachvollziehen.', index: '05' },
  }[tab];
  return <div className="admin-app">
    <aside className="admin-nav">
      {onPasswordChange?<button type="button" className="admin-brand" onClick={event=>{event.currentTarget.focus({preventScroll:true});onPasswordChange();}} aria-label="Passwort ändern" aria-haspopup="dialog" title="Passwort ändern"><span>SEC</span><span className="admin-brand-copy"><strong>Verwaltung</strong><small>Samsung Performance</small></span></button>:<a className="admin-brand" href="/admin"><span>SEC</span><span className="admin-brand-copy"><strong>Verwaltung</strong><small>Samsung Performance</small></span></a>}
      <nav aria-label="Admin-Bereiche">{([
        ['overview', 'Übersicht', 'Status & Aufgaben', LayoutDashboard],
        ['analysis', 'Auswertung', 'Personen & Märkte', UsersRound],
        ['import', 'Excel-Import', 'Prüfen & freigeben', UploadCloud],
        ['configuration', 'KPI-Konfiguration', 'Modelle & Gewichte', Settings2],
        ['history', 'Versionen & Verlauf', 'Snapshots & Audit', History],
        ...(remote?([['accounts','Konten & Rechte','Zugänge & Zuordnung',UsersRound],['privacy','Datenschutz','Anfragen & Sicherheit',ShieldCheck]] as const):[]),
      ] as const).map(([id, text, caption, Icon]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)} aria-label={text} title={text} aria-current={tab === id ? 'page' : undefined}><Icon size={19} /><span><strong>{text}</strong><small>{caption}</small></span></button>)}</nav>
      <div className="admin-nav-bottom"><span className="admin-local-dot"><CircleDot size={17} /></span><span><strong>{remote?'Verbunden':'Lokaler Modus'}</strong><small>{remote?'Supabase · geschützter Bereich':'Browser-only · keine Übertragung'}</small></span></div>
      <a className="admin-back" href={remote?'/preview':'/'} aria-label={remote?'Fiktive UI-Vorschau öffnen':'Phone-Ansichten öffnen'} title={remote?'UI-Vorschau':'Phone-Ansichten'}><ArrowLeft size={16} /><span className="admin-back-copy">{remote?'UI-Vorschau':'Phone-Ansichten'}</span><ExternalLink size={14} /></a>
    </aside>
    <main className={`admin-main admin-page-${tab}`}><header className="admin-top"><div className="admin-title-block"><span className="admin-eyebrow">SEC / Verwaltung</span><h1>{pageMeta.title}</h1><p>{pageMeta.description}</p></div><div className="admin-top-actions"><span className="admin-demo-badge"><i /> {remote?'Veröffentlichte Daten':'Lokale Demo'}</span>{tab !== 'import' && <button className="admin-header-action" onClick={() => setTab('import')}><UploadCloud size={16} /> Neuer Import</button>}</div></header>
      {!remote&&<section className="admin-meeting-banner" aria-label="Demo-Daten für die Abstimmung"><details><summary><span className="admin-demo-marker">Demo</span>{MEETING_PEOPLE.length} fiktive SEC · 5 Obergruppen · Stand 24.09.2026<ChevronRight size={14} /></summary><p>Beispieldaten für die Abstimmung. Keine echten Personen oder Auszahlungen. Eigene lokale Versionen bleiben erhalten.</p></details><button className="admin-text-link" onClick={loadDemoImport}>Importbeispiel öffnen <ChevronRight size={15} /></button></section>}
      {notice && <div className="admin-notice" role="status"><Check size={18} />{notice}<button onClick={() => setNotice('')} aria-label="Hinweis schließen"><X size={16} /></button></div>}
      {tab === 'overview' && <AdminOverview imports={imports} configs={configs} source={remote?.source} onOpenImport={() => setTab('import')} onOpenConfiguration={nextGroup => { switchConfig(nextGroup); setTab('configuration'); }} onOpenAnalysis={nextScope => { setAnalysisScope(nextScope); setTab('analysis'); }} />}
      {tab === 'analysis' && <AdminAnalysis initialScope={analysisScope} source={remote?.source} />}
      {tab==='accounts'&&remote?.accounts}
      {tab==='privacy'&&remote?.privacy}
      {tab === 'configuration' && selectedVersion && <p className="admin-editor-note">Ausgangsbasis: {configs.find(item => item.id === selectedVersion)?.note ?? 'Lokale Version'}. {remote?'Ziel-/Istwerte dienen nur der Modellvorschau; gespeicherte Berichte ändern sich nicht rückwirkend.':'Ziel-/Istwerte sind Demo-Werte, keine echten Mitarbeiterergebnisse.'}</p>}
      {tab === 'import' && <div className="admin-import-page">
        <div className="admin-import-steps" aria-label="Importfortschritt">
          <span className={sourceName ? 'is-done' : 'is-active'}><b>1</b> Quelle</span>
          <span className={selectedSheet ? 'is-done' : ''}><b>2</b> Einordnung</span>
          <span className={mappedColumns.length ? 'is-active' : ''}><b>3</b> Mapping</span>
          <span><b>4</b> Prüfen</span>
        </div>
        <div className="admin-import-layout">
          <div className="admin-page-grid">
            <section className="admin-card admin-source-card">
              <div className="admin-section-head"><div><span className="admin-step">01 · QUELLE</span><h2>Arbeitsmappe</h2></div><FileSpreadsheet size={23} /></div>
              <label className="admin-drop" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void openFile(event.dataTransfer.files[0]); }}>
                <span className="admin-drop-icon"><UploadCloud size={22} /></span>
                <span><strong>{file ? file.name : demoSource ? 'Eigene Excel-Datei statt Demobeispiel wählen' : 'Excel-Datei auswählen'}</strong><small>.xlsx oder .xlsm · maximal 30 MB · {remote?'geschützter Upload':'bleibt lokal'}</small></span>
                <input type="file" accept=".xlsx,.xlsm" onChange={event => void openFile(event.target.files?.[0])} />
              </label>
              {readingFile && <p role="status" className="admin-muted">{remote?'Arbeitsmappe wird geprüft…':'Arbeitsmappe wird lokal eingelesen…'}</p>}
              {demoSource ? <div className="admin-demo-source"><span className="admin-demo-marker">VORLAGE</span><div><strong>{importGroup === 'DA' ? 'HA / DA' : importGroup} · Pivot Liste</strong><p>Originale Feldnamen, keine Datei oder Personendaten eingelesen.</p></div></div> : !remote&&<button className="admin-text-link" onClick={loadDemoImport}>Pivot-Vorlage laden <ChevronRight size={15} /></button>}
              {sheets.length > 0 ? <div className="admin-sheet-list"><label>Arbeitsblatt<AdminSelect ariaLabel="Arbeitsblatt" searchable value={sheetName} onChange={value => {
                const nextName = value;
                const nextSheet = sheets.find(item => item.name === nextName);
                setSheetName(nextName);
                setColumnMappings(nextSheet ? isPivotSheet(nextSheet.name) && phase === 'MONTH_FINALIZATION' && subtype === 'Monthly Closing' ? closingMappings(nextSheet, importGroup, importMetrics) : suggestColumnMappings(nextSheet, importGroup, importSetting, importMetrics) : []);
                setError(''); setNotice('');
              }} options={sheets.map(sheet => ({ value: sheet.name, label: sheet.name, description: `${sheet.rows} Zeilen · ${sheet.columns.length} Spalten` }))} /></label><span>{sheets.length} Blätter · {selectedSheet?.columns.length ?? 0} Spalten</span></div> : null}
            </section>
            <section className="admin-card admin-scope-card">
              <div className="admin-section-head"><div><span className="admin-step">02 · EINORDNUNG</span><h2>Geltungsbereich</h2></div><SlidersHorizontal size={22} /></div>
              <div className={["admin-form-grid", "admin-scope-grid", importGroup === "DA" ? "has-setting" : ""].join(" ")}>
                <label>Obergruppe<AdminSelect ariaLabel="Obergruppe" value={importGroup} onChange={value => {
                  const next = value as SECGroup['id'];
                  setImportGroup(next);
                  resetImportModel(next, importSetting);
                }} options={allowedGroups.map(item => ({ value: item.id, label: `${item.id} · ${item.description}` }))} /></label>
                {importGroup === 'DA' ? <label>DA-Setting<AdminSelect ariaLabel="DA-Setting" value={importSetting} onChange={value => {
                  const next = value as DASetting;
                  setImportSetting(next);
                  resetImportModel('DA', next);
                }} options={DA_SETTINGS.map(item => ({ value: item.value, label: item.label }))} /></label> : null}
                {remote&&<label>Datenstand<AdminDatePicker ariaLabel="Datenstand" value={asOf} onChange={setAsOf}/></label>}
                <label>Berichtsmonat<AdminMonthPicker value={importMonth} onChange={setImportMonth} ariaLabel="Berichtsmonat" /></label>
                <label>Phase<AdminSelect ariaLabel="Phase" value={phase} onChange={value => {
                  const next = value as ImportPhase;
                  setPhase(next);
                  resetImportModel(importGroup, importSetting, next, subtype);
                }} options={PHASES.map(item => ({ value: item.value, label: item.label, description: item.explanation }))} /></label>
                <label className="admin-scope-subtype">Dateityp<AdminSelect ariaLabel="Dateityp" value={subtype} onChange={value => {
                  const next = value;
                  setSubtype(next);
                  resetImportModel(importGroup, importSetting, phase, next);
                }} options={['Progress-Tracker', 'Monthly Closing', 'Targetliste', 'Sonstige Quelle'].map(value => ({ value, label: value }))} /></label>
              </div>
              <p className="admin-context-note">{PHASES.find(item => item.value === phase)?.explanation}</p>
            </section>
            <section className="admin-card admin-mapping-card">
              <div className="admin-section-head"><div><span className="admin-step">03 · MAPPING</span><h2>Importvertrag je Spalte</h2></div><Columns3 size={23} /></div>
              {!selectedSheet ? <div className="admin-empty compact"><Columns3 size={26} /><h3>Erst eine Arbeitsmappe wählen</h3><p>Danach erhält jede erkannte Excel-Spalte eine eigene Mapping-Zeile.</p></div> : closingMode ? <ClosingMappingWorkspace key={importGroup + sheetName} sheet={selectedSheet} group={importGroup} metrics={importMetrics} mappings={columnMappings} onChange={next => { setColumnMappings(next); setError(''); setNotice(''); }} /> : <ColumnMappingWorkspace
                sheet={selectedSheet}
                group={importGroup}
                setting={importSetting}
                metrics={importMetrics}
                mappings={columnMappings}
                onMappingsChange={setColumnMappings}
                datasets={datasets}
                onDatasetsChange={setDatasets}
                splitCategories={splitCategories}
                onSplitCategoriesChange={setSplitCategories}
              />}
            </section>
            {remote&&remoteCheck?.identityMatches&&<ImportIdentityReview matches={remoteCheck.identityMatches} people={remoteCheck.people??[]} choices={personMatches} onChange={(row,person)=>{setPersonMatches(current=>({...current,[String(row)]:person}));setStaged('');setError('');setNotice('');}}/>}
          </div>
          <aside className="admin-side-stack admin-import-aside">
            <section className="admin-card admin-release-card">
              <span className="admin-step">{remote?'05':'04'} · PRÜFEN</span><h2>Freigabe-Vorschau</h2>
              <div className="admin-release-summary">
                <div><span>Aktiver Stand</span><strong>{sameMonthImports.length ? `v${sameMonthImports.length} · ${sameMonthImports.at(-1)?.phase}` : 'Keiner'}</strong></div>
                <div><span>Neuer Stand</span><strong>{selectedSheet ? `${importGroup} · ${importMonth}` : 'Datei wählen'}</strong></div>
                <div><span>Mapping</span><strong>{selectedSheet ? `${mappedColumns.length} zugeordnet · ${columnMappings.length - mappedColumns.length} ignoriert` : '—'}</strong></div>
                <div><span>Split</span><strong>{splitCategories.length ? splitCategories.join(' · ') : 'Nicht gewählt'}</strong></div>
              </div>
              {selectedSheet && !validateImport() ? <p className="admin-validation-ok"><Check size={16} /> {closingMode ? 'Mapping und Monatsdaten geprüft' : 'Mapping vollständig für die lokale Vorschau'}</p> : <p className="admin-validation-pending"><Columns3 size={16} /> {selectedSheet ? validateImport() : 'Datei und Arbeitsblatt auswählen.'}</p>}
              {error ? <p className="admin-error" role="alert">{error}</p> : null}
              <p className="admin-prototype-note">{remote?'Die Prüfung speichert noch keine Veröffentlichung. Nach dem Speichern als Entwurf gibst du den Stand ausdrücklich frei.':closingMode ? 'Zellwerte werden lokal zugeordnet und bleiben im Arbeitsspeicher dieser Sitzung. Gespeichert werden nur Mapping und Importmetadaten. Keine Datenbank oder Übertragung.' : 'Diese Freigabe speichert nur den Mapping-Vertrag und Metadaten im Browser. Keine Datei, Zelle oder Person wird hochgeladen.'}</p>
              {remote&&<button className="admin-subtle wide" disabled={!previewId||busy} onClick={()=>void checkRemote()}>Daten prüfen</button>}
              <button className="admin-primary wide" onClick={()=>remote?void releaseRemote():releaseImport()} disabled={busy||!selectedSheet || readingFile || (!remote&&phase === 'MONTH_FINALIZATION' && subtype === 'Monthly Closing' && Boolean(validateImport()))}><ShieldCheck size={17} /> {remote?busy?'Speichern…':'Als Entwurf speichern':closingMode ? importedClosing ? 'Bereits lokal importiert' : 'Lokal importieren' : 'Vorschau-Stand freigeben'}</button>
              {remote&&staged&&checkedSignature===remoteSignature&&<button className="admin-primary wide" disabled={busy} onClick={()=>void publishRemote()}>Veröffentlichen</button>}
              {remoteCheck&&remote&&<div className="admin-muted"><p>{remoteCheck.count} passende Datensätze · {remoteCheck.otherMonths} andere Monate · {remoteCheck.specialValues} Sonderwerte</p>{remoteCheck.issues.slice(0,12).map((issue,i)=><p className="admin-error" key={i}>Zeile {issue.row}{issue.column||issue.field?` · ${issue.column||issue.field}`:''}: {issue.message}</p>)}</div>}
              {closingPreview && <ClosingImportPreview result={importedClosing?.result ?? closingPreview} imported={Boolean(importedClosing)} />}
            </section>
            <section className="admin-card admin-source-summary"><span className="admin-step">QUELLSTRUKTUR</span><h2>{selectedSheet?.name ?? 'Kein Blatt gewählt'}</h2>{selectedSheet ? <><div className="admin-source-metrics"><span><b>{selectedSheet.rows}</b> Zeilen</span><span><b>{selectedSheet.columns.length}</b> Spalten</span><span><b>{selectedSheet.dimension}</b> Bereich</span></div><p className="admin-muted">Es werden nur Blattstruktur und Header gezeigt. Zellwerte und personenbezogene Daten bleiben verborgen.</p></> : <p className="admin-muted">Die Struktur erscheint nach dem lokalen Einlesen.</p>}</section>
          </aside>
        </div>
      </div>}
      {tab === 'configuration' && <div className="admin-configuration-workspace"><div className="admin-two-col admin-configuration-columns"><div className="admin-page-grid"><section className="admin-card admin-config-context"><div className="admin-section-head"><div><span className="admin-step">QUELLENMODELL · EDITIERBAR</span><h2>KPI-Set für {group}</h2></div><Settings2 size={25} /></div><div className={["admin-form-grid", group === "DA" ? "has-setting" : ""].join(" ")}><label>Obergruppe<AdminSelect ariaLabel="Konfigurationsgruppe" value={group} onChange={value => switchConfig(value as SECGroup['id'])} options={allowedGroups.map(item => ({ value: item.id, label: `${item.id} · ${item.description}` }))} /></label>{group === 'DA' && <label>DA-Setting<AdminSelect ariaLabel="Konfigurations-Setting" value={setting} onChange={value => switchConfig('DA', value as DASetting)} options={DA_SETTINGS.map(item => ({ value: item.value, label: item.label }))} /></label>}<label>Gültig ab<AdminDatePicker value={effective} onChange={setEffective} ariaLabel="Gültig ab" /></label><label className="admin-config-note">Änderungsnotiz<input value={versionNote} onChange={event => setVersionNote(event.target.value)} placeholder="Warum wurde das Set geändert?" /></label></div><p className="admin-muted">{label}. Ziel/Ist sind reine Vorschauwerte; Gewichte sind quellenbasiert, soweit bestätigt. {remote?'Neue Importe verwenden die am Datenstand gültige Version.':'Veränderungen wirken erst nach dem lokalen Speichern der Version.'}</p></section>
          <AdminMetricEditor metrics={draft} onUpdate={updateMetric} canSave={!busy&&validWeights && Boolean(effective)} onSave={saveConfig} onAdd={() => setDraft(current => [...current, { id: freshId(), label: 'Neue Kennzahl', unit: '%', weight: 0, target: 100, actual: 0, active: true, block: current.find(item => item.dataset !== 'softbonus')?.block ?? 'Sell-out', dataset: 'sellout' }])} onAddSoftbonus={() => setDraft(current => [...current, { id: freshId(), label: 'Neuer Softbonus', unit: '%', weight: 0, target: 100, actual: 0, active: true, block: 'Softbonus', dataset: 'softbonus' }])} /></div>
        <aside className="admin-side-stack"><section className="admin-card admin-live-preview"><span className="admin-step">LIVE-VORSCHAU · {group}</span><h2>{label}</h2><p>Aktive KPI-Gewichte und Ziel-/Istwerte</p>{draft.filter(metric => metric.active).map(metric => <div className="admin-preview-metric" key={metric.id}><span>{metric.label}<small>{metric.block}</small></span><b>{metric.target > 0 ? Math.round(metric.actual / metric.target * 100) : '—'}%</b><i><em style={{ width: `${metric.target > 0 ? Math.min(100, Math.max(0, metric.actual / metric.target * 100)) : 0}%` }} /></i><small>{metric.weight ?? '—'}% Gewicht · {metric.actual}/{metric.target} {metric.unit}</small></div>)}<p className="admin-muted">Die tatsächliche kombinierte Zielerreichung wird hier bewusst nicht berechnet, solange ASP/AV und weitere Regeln offen sind.</p></section></aside></div><section className="admin-card admin-config-history"><div className="admin-section-head"><div><span className="admin-step">HISTORIE</span><h2>{versions.length} gespeicherte Versionen</h2></div><button className="admin-text-link" onClick={() => setTab('history')}>Alle Versionen ansehen <ChevronRight size={16} /></button></div><div className="admin-version-list">{versions.length ? versions.slice(0, 4).map((version, index) => <button className="admin-version-link" key={version.id} onClick={() => { setDraft(structuredClone(version.metrics)); setSelectedVersion(version.id); setEffective(version.effective); setNotice(`Historische Version geladen. Änderungen erst durch neues Speichern wirksam.`); }}><strong>v{versions.length - index} · ab {version.effective}</strong><span>{version.note}</span></button>) : <p className="admin-muted">Das Quellenmodell ist geladen. Speichere die erste eigene Version.</p>}</div></section></div>}
      {tab === 'history' && <AdminHistory live={Boolean(remote)} configs={configs} imports={imports} onExport={exportJson} onLoad={item => { switchConfig(item.group, item.setting); setDraft(structuredClone(item.metrics)); setSelectedVersion(item.id); setEffective(item.effective); setTab('configuration'); }} />}
    </main>
  </div>;
}
