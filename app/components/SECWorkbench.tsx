"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  ClipboardCheck,
  Copy,
  Download,
  Filter,
  Home,
  Medal,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Smartphone,
  TrendingUp,
  Wifi,
} from "lucide-react";
import { DashboardFilters } from './DashboardFilters';
import { UpdatesPanel } from './UpdatesPanel';
import { PointsRules } from './PointsRules';
import { useDashboardNavigation } from './useDashboardNavigation';
import { countFilters, groupDefaultFilters, type DashboardFilters as FilterValues } from '../lib/dashboard';
import { MonthlyDashboard } from './MonthlyDashboard';
import { PhoneSelect } from './PhoneSelect';
import { weeklyTargetFixtures, type WeeklyTargetSnapshot } from '../lib/weeklyTargets';
import { usePublicationReadState } from './usePublicationReadState';
import { activeReports, closingFixtures, DEMO_CALENDAR_DAY, latestReport, monthName, newPublications, PREVIEW_SCENARIOS, previousMonth, type PreviewScenario, type MonthlyReport } from '../lib/monthlyClosing';
import { SEC_GROUPS, GROUP_GAPS, DA_SETTINGS, type DASetting, type SECGroup } from '../lib/groups';

type PhonePanel = 'filters' | 'rules' | 'updates';
type ActivePhonePanel = { groupId: SECGroup['id']; panel: PhonePanel } | null;

type ColorKey =
  | "workbench"
  | "canvas"
  | "surface"
  | "nestedSurface"
  | "blue"
  | "green"
  | "subheader"
  | "text"
  | "muted"
  | "inactive"
  | "border"
  | "shadow";

type ThemeConfig = {
  name: string;
  colors: Record<ColorKey, string>;
  opacities: Record<ColorKey, number>;
  effects: {
    shadowOpacity: number;
    shadowBlur: number;
    borderOpacity: number;
  };
  radii: {
    card: number;
    nested: number;
    dock: number;
  };
};

const FULL_OPACITY: Record<ColorKey, number> = {
  workbench: 1,
  canvas: 1,
  surface: 1,
  nestedSurface: 1,
  blue: 1,
  green: 1,
  subheader: 1,
  text: 1,
  muted: 1,
  inactive: 1,
  border: 1,
  shadow: 1,
};

const ACCEPTED_THEME: ThemeConfig = {
  name: "Accepted · User Palette",
  colors: {
    workbench: "#FFFFFF",
    canvas: "#F5F9FF",
    surface: "#FFFFFF",
    nestedSurface: "#FBFCFF",
    blue: "#0651BB",
    green: "#04B87A",
    subheader: "#9AB2E3",
    text: "#07152F",
    muted: "#6C7DA8",
    inactive: "#B7C4E0",
    border: "#E7EDF7",
    shadow: "#000000",
  },
  opacities: {
    ...FULL_OPACITY,
    nestedSurface: 0.5,
  },
  effects: {
    shadowOpacity: 0.13,
    shadowBlur: 19,
    borderOpacity: 0.03,
  },
  radii: {
    card: 42,
    nested: 36,
    dock: 64,
  },
};

const ARCTIC_MARINE_THEME: ThemeConfig = {
  name: "Arctic Marine",
  colors: {
    workbench: "#E9EDF4",
    canvas: "#F7F9FC",
    surface: "#FFFFFF",
    nestedSurface: "#FBFCFF",
    blue: "#0868F2",
    green: "#04B87A",
    subheader: "#6F91D7",
    text: "#07152F",
    muted: "#6C7DA8",
    inactive: "#B7C4E0",
    border: "#E7EDF7",
    shadow: "#6680AA",
  },
  opacities: FULL_OPACITY,
  effects: {
    shadowOpacity: 0.13,
    shadowBlur: 32,
    borderOpacity: 0.72,
  },
  radii: {
    card: 42,
    nested: 36,
    dock: 64,
  },
};

const PRESETS: ThemeConfig[] = [
  ACCEPTED_THEME,
  ARCTIC_MARINE_THEME,
  {
    ...ARCTIC_MARINE_THEME,
    name: "Silver Mist",
    colors: {
      ...ARCTIC_MARINE_THEME.colors,
      workbench: "#E7EAF0",
      canvas: "#F3F5F8",
      surface: "#FFFFFF",
      nestedSurface: "#F8FAFC",
      blue: "#356A9A",
      green: "#2B9271",
      subheader: "#7186A6",
      inactive: "#C2CAD8",
    },
  },
  {
    ...ARCTIC_MARINE_THEME,
    name: "Warm Porcelain",
    colors: {
      ...ARCTIC_MARINE_THEME.colors,
      workbench: "#EEECE8",
      canvas: "#FAF8F5",
      surface: "#FFFEFC",
      nestedSurface: "#FBF8F3",
      blue: "#3E6F9E",
      green: "#3A9376",
      subheader: "#8493AA",
      border: "#ECE6DE",
      shadow: "#8F887E",
    },
  },
  {
    ...ARCTIC_MARINE_THEME,
    name: "Ice Marine",
    colors: {
      ...ARCTIC_MARINE_THEME.colors,
      workbench: "#E4EDF4",
      canvas: "#F2F8FC",
      surface: "#FFFFFF",
      nestedSurface: "#F5FAFE",
      blue: "#2B73B6",
      green: "#1CA27D",
      subheader: "#6F9BC1",
      border: "#DFEBF4",
      shadow: "#5D82A4",
    },
  },
  {
    ...ARCTIC_MARINE_THEME,
    name: "Soft Graphite",
    colors: {
      ...ARCTIC_MARINE_THEME.colors,
      workbench: "#E5E7EB",
      canvas: "#F5F6F7",
      surface: "#FFFFFF",
      nestedSurface: "#F7F8FA",
      blue: "#365D83",
      green: "#3D8A71",
      subheader: "#718096",
      text: "#152033",
      muted: "#738096",
      inactive: "#C2CAD5",
      border: "#E4E8ED",
      shadow: "#66717F",
    },
  },
];

const COLOR_CONTROLS: Array<{
  key: ColorKey;
  label: string;
  description: string;
  swatches: string[];
}> = [
  {
    key: "workbench",
    label: "Workbench",
    description: "Desktop background",
    swatches: ["#FFFFFF", "#E9EDF4", "#E7EAF0", "#EEECE8", "#E4EDF4"],
  },
  {
    key: "canvas",
    label: "App background",
    description: "Phone canvas",
    swatches: ["#F5F9FF", "#F7F9FC", "#F3F5F8", "#FAF8F5", "#F2F8FC"],
  },
  {
    key: "surface",
    label: "Cards",
    description: "Primary surfaces",
    swatches: ["#FFFFFF", "#FCFDFE", "#FFFEFC", "#F8FBFD", "#F7F8FA"],
  },
  {
    key: "nestedSurface",
    label: "Cards in cards",
    description: "Inset filter surface",
    swatches: ["#FBFCFF", "#F8FAFC", "#FBF8F3", "#F5FAFE", "#F1F4F7"],
  },
  {
    key: "blue",
    label: "Shared blue",
    description: "Active data + navigation",
    swatches: ["#0651BB", "#0868F2", "#286DA8", "#2B73B6", "#365D83"],
  },
  {
    key: "green",
    label: "Softbonus green",
    description: "Positive metric accent",
    swatches: ["#04B87A", "#159A72", "#2B9271", "#1CA27D", "#3D8A71"],
  },
  {
    key: "subheader",
    label: "Subheaders",
    description: "Low-opacity accent copy",
    swatches: ["#9AB2E3", "#6F91D7", "#7186A6", "#6F9BC1", "#718096"],
  },
  {
    key: "text",
    label: "Primary text",
    description: "Titles and chart labels",
    swatches: ["#07152F", "#101A2B", "#182235", "#13233A", "#152033"],
  },
  {
    key: "muted",
    label: "Muted text",
    description: "Secondary labels + values",
    swatches: ["#6C7DA8", "#718096", "#78879B", "#687C91", "#758092"],
  },
  {
    key: "inactive",
    label: "Inactive data",
    description: "Open annual points",
    swatches: ["#B7C4E0", "#C2CAD8", "#C9C5BE", "#B8CADB", "#C2CAD5"],
  },
  {
    key: "border",
    label: "Hairline borders",
    description: "Card and control outlines",
    swatches: ["#E7EDF7", "#E3E8F0", "#ECE7E0", "#DDEAF3", "#E4E8ED"],
  },
  {
    key: "shadow",
    label: "Shadow tint",
    description: "All-edge elevation color",
    swatches: ["#000000", "#6680AA", "#66778F", "#5D82A4", "#66717F"],
  },
];

const STORAGE_KEY = "sec-dashboard-theme-v1";
const SHAPE_REVISION = "soft-continuous-corners-v3";

type StoredThemePayload = Partial<ThemeConfig> & {
  theme?: Partial<ThemeConfig>;
  shapeRevision?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mergeTheme(value: Partial<ThemeConfig>): ThemeConfig {
  return {
    name: typeof value.name === "string" ? value.name : "Custom",
    colors: { ...ACCEPTED_THEME.colors, ...(value.colors ?? {}) },
    opacities: { ...ACCEPTED_THEME.opacities, ...(value.opacities ?? {}) },
    effects: { ...ACCEPTED_THEME.effects, ...(value.effects ?? {}) },
    radii: { ...ACCEPTED_THEME.radii, ...(value.radii ?? {}) },
  };
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return {
    red: Number.parseInt(value.slice(0, 2), 16),
    green: Number.parseInt(value.slice(2, 4), 16),
    blue: Number.parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex(red: number, green: number, blue: number) {
  const channel = (value: number) => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0");
  return `#${channel(red)}${channel(green)}${channel(blue)}`.toUpperCase();
}

function mixTone(hex: string, amount: number) {
  const source = hexToRgb(hex);
  const target = amount < 0 ? 0 : 255;
  const ratio = Math.abs(amount);
  return rgbToHex(
    source.red + (target - source.red) * ratio,
    source.green + (target - source.green) * ratio,
    source.blue + (target - source.blue) * ratio,
  );
}

function buildToneScale(hex: string) {
  return [0.66, 0.48, 0.3, 0.14, 0, -0.12, -0.24, -0.38].map((amount) => mixTone(hex, amount));
}

function withOpacity(hex: string, opacity: number) {
  const { red, green, blue } = hexToRgb(hex);
  return `rgb(${red} ${green} ${blue} / ${opacity})`;
}


export type LivePhoneData = { groupId: SECGroup['id']; setting: DASetting; reports: readonly MonthlyReport[]; targetSnapshots: readonly WeeklyTargetSnapshot[]; calendarDay: string; readIds: readonly string[]; acknowledge: (reports: readonly MonthlyReport[]) => void; rankings?: Record<string,{ pool: number; rank: number | null; outsideTopTen: boolean }> };
function SECPhone({ group, panel, scenario, setting, onOpenPanel, onClosePanel, live }: {
 group: SECGroup; panel: PhonePanel | null; scenario: PreviewScenario; setting: DASetting;
 onOpenPanel:(panel:PhonePanel)=>void; onClosePanel:()=>void; live?: LivePhoneData;
}) {
 const {scrollRegionRef,activeSection,scrollToSection,cancelNavigation}=useDashboardNavigation(group.id);
 const [filterDraft,setFilterDraft]=useState<FilterValues>(()=>({...groupDefaultFilters(group.id),comparison:'month',status:'final'}));
 const [selectedMonth,setSelectedMonth]=useState<string|null>(null);
 const reports=useMemo(()=>live?.reports??closingFixtures(group.id,setting,scenario),[group.id,setting,scenario,live?.reports]);
 const latest=latestReport(reports);
 const report=activeReports(reports).find(r=>r.month===(selectedMonth??latest?.month))??null;
 const defaults:FilterValues={...groupDefaultFilters(group.id),month:latest?.month??'2026-09',status:'final',comparison:'month',daSetting:setting};
 const filters={...filterDraft,month:report?.month??selectedMonth??defaults.month,daSetting:setting,snapshot:'latest',status:'final' as const};
 const filterCount=countFilters(filters,defaults);
 const {read,acknowledge}=usePublicationReadState(group.id,setting,live?{ids:live.readIds,acknowledge:live.acknowledge}:undefined);
 const pendingView = useRef<string | null>(null);
 useEffect(() => {
  if (panel === null && report && pendingView.current === report.publicationId) {
   pendingView.current = null;
   scrollToSection('home', () => { if (document.visibilityState === 'visible') acknowledge([report]); });
  }
 }, [panel, report, acknowledge, scrollToSection]);
 const publications=newPublications(reports);
 const unread=new Set(publications.filter(r=>!read.has(r.publicationId)).map(r=>r.publicationId));
 const latestUnread=latest&&latest.month!==report?.month&&unread.has(latest.publicationId)?latest:null;
 const calendarDay=live?.calendarDay??(scenario==='new-month'?'2026-11-12':scenario==='release-window'?'2026-10-17':DEMO_CALENDAR_DAY);
 const targetSnapshots=useMemo(()=>live?.targetSnapshots??weeklyTargetFixtures(group.id,setting),[group.id,setting,live?.targetSnapshots]);
 const title=!report?'Monatsabschluss':report.month===previousMonth(calendarDay.slice(0,7))?'Letzter Monat':report.month===latest?.month?'Letzter Abschluss':'Monatsabschluss';
 function openFilters(){cancelNavigation();onOpenPanel('filters');}
 function viewDetails(){if(!report)return;scrollToSection('monthly',()=>{if(document.visibilityState==='visible')acknowledge([report]);});}
 function viewLatest(){setSelectedMonth(null);scrollToSection('home');}
 return <div className="phone-canvas" data-testid="sec-phone" data-group={group.id} data-template={group.template} data-scenario={scenario}>
  <div className="phone-dashboard" inert={panel!==null}>
   <div className="status-bar" aria-label="Status bar"><span className="status-time">08:12</span><div className="status-icons" aria-hidden="true"><span className="cell-bars"><i/><i/><i/><i/></span><Wifi className="status-wifi" size={28} strokeWidth={3.2}/><span className="battery-mark"><i/></span></div></div>
   <div className="phone-scroll-region" ref={scrollRegionRef} tabIndex={0} role="region" aria-label={group.id+' Dashboard, vertikal scrollbar'}>
    <div className="phone-scroll-content monthly-layout"><span className="scroll-anchor home-anchor" id={group.id+'-section-home'}/>
     <header className="phone-header"><h1>{title}</h1><button className="phone-month-control" onClick={openFilters} aria-label={'Berichtsmonat '+(report?monthName(report.month):'auswählen')+' ändern'}>{group.id} <span>·</span> {report?monthName(report.month):'Noch kein Bericht'} <span>⌄</span></button><button type="button" className="header-targets-jump" aria-controls={group.id+'-section-targets'} aria-current={activeSection==='targets'?'location':undefined} aria-label={'Monatliche Ziele '+monthName(calendarDay.slice(0,7))+' anzeigen'} onClick={()=>scrollToSection('targets',undefined,{instant:true,focus:true})}><span>Monatliche Ziele</span><span>{monthName(calendarDay.slice(0,7),true)}<ChevronDown size={24} strokeWidth={1.8}/></span></button></header>
     <div className="header-actions" aria-label="Schnellaktionen"><button className={filterCount?'has-filters':undefined} aria-label={'Filter'+(filterCount?', '+filterCount+' aktiv':'')} aria-haspopup="dialog" aria-expanded={panel==='filters'} onClick={openFilters}><Filter size={31} strokeWidth={1.7}/>{filterCount>0&&<span className="active-filter-count">{filterCount}</span>}</button><button aria-label="Daten-Updates anzeigen" aria-haspopup="dialog" aria-expanded={panel==='updates'} onClick={()=>{cancelNavigation();onOpenPanel('updates');}}><Bell size={31} strokeWidth={1.65}/>{unread.size>0&&<span className="update-notification-dot"/>}</button></div>
     {scenario==='lag'&&<p className="monthly-lag-note">September noch nicht veröffentlicht.</p>}
     {scenario==='offline'&&<div className="monthly-lag-note" role="status">Aktualisierung nicht möglich. Dein letzter Abschluss bleibt verfügbar. <button onClick={()=>onOpenPanel('updates')}>Gespeicherten Stand ansehen</button></div>}
     <MonthlyDashboard group={group} report={report} reports={reports} filters={filters} calendarDay={calendarDay} targetSnapshots={targetSnapshots} unread={!!report&&unread.has(report.publicationId)} latestUnread={latestUnread} onDetails={viewDetails} onLatest={viewLatest} onOpenRules={()=>{cancelNavigation();onOpenPanel('rules');}} rulesOpen={panel==='rules'} onTargetsView={()=>scrollToSection('targets',undefined,{instant:true})} realData={!!live} ranking={report?live?.rankings?.[report.month]:undefined}/>
    </div>
   </div>
   <nav className="bottom-dock" aria-label="Dashboard-Abschnitte">
    <button className={activeSection==='home'?'is-active':undefined} aria-label="Letzter Monatsabschluss" aria-current={activeSection==='home'?'location':undefined} onClick={()=>scrollToSection('home')}><Home size={38} strokeWidth={1.75}/></button>
    <button className={activeSection==='trend'?'is-active':undefined} aria-label={group.id==='ST'?'Qualitativer Monatsverlauf':'Monatsverlauf'} aria-current={activeSection==='trend'?'location':undefined} onClick={()=>scrollToSection('trend')}><TrendingUp size={44} strokeWidth={2.05}/></button>
    <button className={activeSection==='monthly'?'is-active':undefined} aria-label={group.id==='ST'?'Qualitative Monatsdetails':'Monatsdetails'} aria-current={activeSection==='monthly'?'location':undefined} onClick={viewDetails}><BarChart3 size={38} strokeWidth={1.65}/></button>
    <button className={activeSection==='category'?'is-active':undefined} aria-label={group.id==='ST'?'Bewertungskriterien':'Jahresfortschritt und SEC-Level'} aria-current={activeSection==='category'?'location':undefined} onClick={()=>scrollToSection('category')}>{group.id==='ST'?<ClipboardCheck size={38} strokeWidth={1.65}/>:<Medal size={38} strokeWidth={1.65}/>}</button>
   </nav>
  </div>
  <span className="sr-only" role="status">{filterCount?filterCount+' Filter aktiv.':'Standardansicht'}</span>
  {panel==='filters'&&<DashboardFilters value={filters} group={group} reports={reports} defaults={defaults} realData={!!live} onClose={onClosePanel} onApply={next=>{setFilterDraft(next);setSelectedMonth(next.month===latest?.month?null:next.month);onClosePanel();}}/>}
  {panel==='updates'&&<UpdatesPanel group={group} reports={reports} unread={unread} onClose={onClosePanel} onDone={seen=>{acknowledge(seen);onClosePanel();}} onView={next=>{pendingView.current=activeReports(reports).find(r=>r.month===next.month)?.publicationId??null;setSelectedMonth(next.month===latest?.month?null:next.month);onClosePanel();}}/>}
  {panel==='rules'&&group.showPointsRules&&<PointsRules group={group} onClose={onClosePanel}/>}
 </div>;
}

function ColorControl({
  control,
  value,
  opacity,
  originalValue,
  originalOpacity,
  onChange,
  onOpacityChange,
  onReset,
}: {
  control: (typeof COLOR_CONTROLS)[number];
  value: string;
  opacity: number;
  originalValue: string;
  originalOpacity: number;
  onChange: (value: string) => void;
  onOpacityChange: (value: number) => void;
  onReset: () => void;
}) {
  const tones = buildToneScale(value);
  const isOriginal = value === originalValue && opacity === originalOpacity;

  return (
    <div className="color-control">
      <div className="color-meta">
        <div><strong>{control.label}</strong><span>{control.description}</span></div>
        <button
          className="control-reset"
          disabled={isOriginal}
          aria-label={`Reset ${control.label} to original`}
          title="Reset this token to the accepted original"
          onClick={onReset}
        ><RotateCcw size={13} /><span>Reset</span></button>
      </div>

      <div className="picker-row">
        <label className="palette-picker">
          <input type="color" value={value} onChange={(event) => onChange(event.target.value.toUpperCase())} />
          <span style={{ background: withOpacity(value, opacity) }} />
          <b>Color palette</b>
        </label>
        <label className="hex-field">
          <span aria-hidden="true" style={{ background: withOpacity(value, opacity) }} />
          <input
            aria-label={`${control.label} hex value`}
            value={value}
            onChange={(event) => {
              const next = event.target.value.toUpperCase();
              if (/^#[0-9A-F]{6}$/.test(next)) onChange(next);
            }}
          />
        </label>
      </div>

      <div className="palette-label"><span>Curated</span><small>Predefined</small></div>
      <div className="swatch-row curated-swatches">
        {control.swatches.map((swatch) => (
          <button
            aria-label={`${control.label} ${swatch}`}
            className={value === swatch ? "is-selected" : ""}
            key={swatch}
            onClick={() => onChange(swatch)}
            style={{ background: swatch }}
          >
            {value === swatch && <Check size={13} />}
          </button>
        ))}
      </div>

      <div className="palette-label"><span>Tone scale</span><small>Same color · light to deep</small></div>
      <div className="swatch-row tone-swatches">
        {tones.map((tone, index) => (
          <button
            aria-label={`${control.label} tone ${index + 1} ${tone}`}
            className={value === tone ? "is-selected" : ""}
            key={`${tone}-${index}`}
            onClick={() => onChange(tone)}
            style={{ background: tone }}
          >
            {value === tone && <Check size={12} />}
          </button>
        ))}
      </div>

      <label className="opacity-control">
        <span>Opacity <b>{Math.round(opacity * 100)}%</b></span>
        <input
          aria-label={`${control.label} opacity`}
          type="range"
          min="0.05"
          max="1"
          step="0.01"
          value={opacity}
          onChange={(event) => onOpacityChange(Number(event.target.value))}
        />
      </label>
    </div>
  );
}

function RangeControl({
  label,
  value,
  originalValue,
  min,
  max,
  step,
  displayValue,
  onChange,
  onReset,
}: {
  label: string;
  value: number;
  originalValue: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (value: number) => void;
  onReset: () => void;
}) {
  return (
    <div className="range-control">
      <div className="range-head">
        <span>{label} <b>{displayValue}</b></span>
        <button
          className="control-reset"
          disabled={value === originalValue}
          aria-label={`Reset ${label} to original`}
          title="Reset this value to the accepted original"
          onClick={onReset}
        ><RotateCcw size={13} /><span>Reset</span></button>
      </div>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

export function SECWorkbench({ live }: { live?: LivePhoneData } = {}) {
  const [theme, setTheme] = useState<ThemeConfig>(ACCEPTED_THEME);
  const [hasLoadedTheme, setHasLoadedTheme] = useState(false);
  const [jsonDraft, setJsonDraft] = useState("");
  const [message, setMessage] = useState("Ready");
  const [phoneScale, setPhoneScale] = useState(0.455);
  const [activePanel, setActivePanel] = useState<ActivePhonePanel>(null);
  const [scenarios, setScenarios] = useState<Partial<Record<SECGroup["id"], PreviewScenario>>>({});
  const [daSetting, setDaSetting] = useState<DASetting>("full");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as StoredThemePayload;
          const restoredTheme = mergeTheme(parsed.theme ?? parsed);

          if (parsed.shapeRevision !== SHAPE_REVISION) {
            restoredTheme.radii = { ...ACCEPTED_THEME.radii };
          }

          setTheme(restoredTheme);
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
      setHasLoadedTheme(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hasLoadedTheme) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, shapeRevision: SHAPE_REVISION }));
  }, [hasLoadedTheme, theme]);

  useEffect(() => {
    const resize = () => {
      const byHeight = (window.innerHeight - 112) / 1844;
      const previewWidth = window.innerWidth <= 980 ? window.innerWidth - 44 : window.innerWidth - 520;
      const byWidth = (previewWidth - 20) / 853;
      setPhoneScale(clamp(Math.min(0.49, byHeight, byWidth), 0.285, 0.49));
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const exportPayload = useMemo(
    () => ({
      schema: "sec-dashboard-theme/v1",
      page: "continuous-performance",
      sourceFrame: "03-ranking-history-actual.png",
      sourceFrames: ["03-ranking-history-actual.png", "02-kpi-details-actual.png"],
      theme,
    }),
    [theme],
  );
  const exportJson = useMemo(() => JSON.stringify(exportPayload, null, 2), [exportPayload]);

  const cssVariables = {
    "--workbench": withOpacity(theme.colors.workbench, theme.opacities.workbench),
    "--sec-canvas": withOpacity(theme.colors.canvas, theme.opacities.canvas),
    "--sec-surface": withOpacity(theme.colors.surface, theme.opacities.surface),
    "--sec-nested": withOpacity(theme.colors.nestedSurface, theme.opacities.nestedSurface),
    "--sec-blue": withOpacity(theme.colors.blue, theme.opacities.blue),
    "--sec-green": withOpacity(theme.colors.green, theme.opacities.green),
    "--sec-subheader": withOpacity(theme.colors.subheader, theme.opacities.subheader),
    "--sec-text": withOpacity(theme.colors.text, theme.opacities.text),
    "--sec-muted": withOpacity(theme.colors.muted, theme.opacities.muted),
    "--sec-inactive": withOpacity(theme.colors.inactive, theme.opacities.inactive),
    "--sec-border": withOpacity(theme.colors.border, theme.opacities.border),
    "--sec-shadow": withOpacity(theme.colors.shadow, theme.opacities.shadow),
    "--shadow-opacity": theme.effects.shadowOpacity,
    "--shadow-blur": `${theme.effects.shadowBlur}px`,
    "--border-opacity": theme.effects.borderOpacity,
    "--card-radius": `${theme.radii.card}px`,
    "--nested-radius": `${theme.radii.nested}px`,
    "--dock-radius": `${theme.radii.dock}px`,
    "--phone-scale": phoneScale,
  } as CSSProperties;

  const updateColor = (key: ColorKey, value: string) => {
    setJsonDraft("");
    setTheme((current) => ({
      ...current,
      name: "Custom",
      colors: { ...current.colors, [key]: value },
    }));
  };

  const updateColorOpacity = (key: ColorKey, value: number) => {
    setJsonDraft("");
    setTheme((current) => ({
      ...current,
      name: "Custom",
      opacities: { ...current.opacities, [key]: value },
    }));
  };

  const resetColor = (key: ColorKey) => {
    setJsonDraft("");
    setTheme((current) => ({
      ...current,
      name: "Custom",
      colors: { ...current.colors, [key]: ACCEPTED_THEME.colors[key] },
      opacities: { ...current.opacities, [key]: ACCEPTED_THEME.opacities[key] },
    }));
  };

  const updateEffect = (key: keyof ThemeConfig["effects"], value: number) => {
    setJsonDraft("");
    setTheme((current) => ({
      ...current,
      name: "Custom",
      effects: { ...current.effects, [key]: value },
    }));
  };

  const resetEffect = (key: keyof ThemeConfig["effects"]) => {
    updateEffect(key, ACCEPTED_THEME.effects[key]);
  };

  const updateRadius = (key: keyof ThemeConfig["radii"], value: number) => {
    setJsonDraft("");
    setTheme((current) => ({
      ...current,
      name: "Custom",
      radii: { ...current.radii, [key]: value },
    }));
  };

  const resetRadius = (key: keyof ThemeConfig["radii"]) => {
    updateRadius(key, ACCEPTED_THEME.radii[key]);
  };

  const resetAll = () => {
    setJsonDraft("");
    setTheme(ACCEPTED_THEME);
    setMessage("Everything reset");
    window.setTimeout(() => setMessage("Ready"), 1800);
  };

  const copyJson = () => {
    setMessage("JSON copied");

    try {
      const fallback = document.createElement("textarea");
      fallback.value = exportJson;
      fallback.setAttribute("readonly", "");
      fallback.style.position = "fixed";
      fallback.style.opacity = "0";
      document.body.appendChild(fallback);
      fallback.select();
      document.execCommand("copy");
      fallback.remove();
    } catch {
      // The async Clipboard API below remains the primary modern fallback.
    }

    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(exportJson).catch(() => undefined);
    }
    window.setTimeout(() => setMessage("Ready"), 1800);
  };

  const downloadJson = () => {
    const url = URL.createObjectURL(new Blob([exportJson], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "sec-dashboard-theme.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("JSON downloaded");
  };

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonDraft || exportJson) as { theme?: Partial<ThemeConfig> } | Partial<ThemeConfig>;
      const next = mergeTheme("theme" in parsed ? parsed.theme ?? {} : parsed as Partial<ThemeConfig>);
      setTheme(next);
      setJsonDraft("");
      setMessage("JSON applied");
    } catch {
      setMessage("Invalid JSON");
    }
  };

  if (live) {
    const group=SEC_GROUPS.find(g=>g.id===live.groupId)!;
    return <div className="workbench live-workbench" style={cssVariables}><div className="device-area"><div className="iphone-shell" style={{width:853*phoneScale+20,height:1844*phoneScale+20}}><i className="side-button side-button-top"/><i className="side-button side-button-mid"/><i className="side-button side-button-lower"/><div className="phone-viewport" style={{width:853*phoneScale,height:1844*phoneScale}}><div className="phone-scale-layer" style={{transform:`scale(${phoneScale})`}}><SECPhone group={group} live={live} scenario="standard" setting={live.setting} panel={activePanel?.panel??null} onOpenPanel={panel=>setActivePanel({groupId:group.id,panel})} onClosePanel={()=>setActivePanel(null)}/></div></div></div></div></div>;
  }
  return (
    <div className="workbench" style={cssVariables}>
      <section className="preview-stage">
        <div className="stage-heading">
          <div>
            <span className="eyebrow"><Smartphone size={15} /> Live preview</span>
            <h2>SEC · Continuous Performance</h2>
          </div>
          <div className="stage-actions"><a href="/admin" className="admin-workbench-link"><SlidersHorizontal size={17} /> Admin Control Center</a><span className="viewport-badge">853 × 1844</span></div>
        </div>

        <div className="phone-previews">
        {SEC_GROUPS.map(group => <section className="group-preview" key={group.id} aria-labelledby={`${group.id}-preview-title`} inert={activePanel !== null && activePanel.groupId !== group.id}>
          <header className="group-preview-heading" style={{ width: 853 * phoneScale + 20 }}>
            <div><h3 id={`${group.id}-preview-title`}>{group.id} SEC</h3><p>{group.description}</p></div>
            <span className="group-template-label">{group.id === 'HE' ? 'Akzeptierte Demo' : group.id === 'LH' || group.id === 'ST' ? 'Quellenstand · offene Fragen' : 'Level Up 2026'}</span>
          </header>
          <div className="monthly-preview-controls" style={{ width: 853 * phoneScale + 20 }}><label>Demo-Zustand<PhoneSelect ariaLabel={group.id+" Demo-Zustand"} value={scenarios[group.id]??"standard"} options={PREVIEW_SCENARIOS} onChange={value=>setScenarios(current=>({...current,[group.id]:value as PreviewScenario}))}/></label>{group.id==="DA"&&<label>Workbench-Zuordnung<PhoneSelect ariaLabel="DA Workbench-Zuordnung" value={daSetting} options={DA_SETTINGS} onChange={value=>setDaSetting(value as DASetting)}/></label>}<small>Kalender: {scenarios[group.id]==="new-month"?"12.11.2026":scenarios[group.id]==="release-window"?"17.10.2026":"12.10.2026"} · synthetische Abschlüsse und Ziele</small></div>
          <div className="device-area">
          <div
            className="iphone-shell"
            style={{
              width: 853 * phoneScale + 20,
              height: 1844 * phoneScale + 20,
            }}
          >
            <i className="side-button side-button-top" />
            <i className="side-button side-button-mid" />
            <i className="side-button side-button-lower" />
            <div
              className="phone-viewport"
              style={{ width: 853 * phoneScale, height: 1844 * phoneScale }}
            >
              <div className="phone-scale-layer" style={{ transform: `scale(${phoneScale})` }}>
                <SECPhone group={group} scenario={scenarios[group.id]??"standard"} setting={group.id==="DA"?daSetting:"full"} panel={activePanel?.groupId === group.id ? activePanel.panel : null} onOpenPanel={panel => setActivePanel({ groupId: group.id, panel })} onClosePanel={() => setActivePanel(null)} />
              </div>
            </div>
          </div>
        </div>
        <details className="group-knowledge-gaps" style={{ width: 853 * phoneScale + 20 }}>
          <summary>{GROUP_GAPS[group.id].length} offene {GROUP_GAPS[group.id].length === 1 ? 'Frage' : 'Fragen'} · {group.id}</summary>
          <ul>{GROUP_GAPS[group.id].map(gap => <li key={gap}>{gap}</li>)}</ul>
        </details>
        </section>)}
        </div>
      </section>

      <aside className="theme-panel" inert={activePanel !== null}>
        <header className="panel-head">
          <div>
            <span className="eyebrow"><Palette size={15} /> Theme lab</span>
            <h1>Design tokens</h1>
            <p>Shared across all five phone previews.</p>
          </div>
          <button
            className="reset-all-button"
            aria-label="Reset to accepted theme"
            onClick={resetAll}
          ><RotateCcw size={16} /><span>Reset all</span></button>
        </header>

        <section className="panel-section">
          <div className="section-title"><span>Clean presets</span><small>{theme.name}</small></div>
          <div className="preset-grid">
            {PRESETS.map((preset) => (
              <button
                className={theme.name === preset.name ? "is-active" : ""}
                key={preset.name}
                onClick={() => {
                  setJsonDraft("");
                  setTheme(preset);
                }}
              >
                <span className="preset-colors">
                  <i style={{ background: preset.colors.canvas }} />
                  <i style={{ background: preset.colors.blue }} />
                  <i style={{ background: preset.colors.green }} />
                </span>
                <strong>{preset.name.replace("Accepted · ", "")}</strong>
                {theme.name === preset.name && <Check size={14} />}
              </button>
            ))}
          </div>
        </section>

        <section className="panel-section">
          <div className="section-title"><span>Color system</span><small>Live</small></div>
          <div className="color-list">
            {COLOR_CONTROLS.map((control) => (
              <ColorControl
                control={control}
                key={control.key}
                value={theme.colors[control.key]}
                opacity={theme.opacities[control.key]}
                originalValue={ACCEPTED_THEME.colors[control.key]}
                originalOpacity={ACCEPTED_THEME.opacities[control.key]}
                onChange={(value) => updateColor(control.key, value)}
                onOpacityChange={(value) => updateColorOpacity(control.key, value)}
                onReset={() => resetColor(control.key)}
              />
            ))}
          </div>
        </section>

        <section className="panel-section detail-controls">
          <div className="section-title"><span>Apple-clean surfaces</span><SlidersHorizontal size={16} /></div>
          <RangeControl
            label="All-edge shadow"
            value={theme.effects.shadowOpacity}
            originalValue={ACCEPTED_THEME.effects.shadowOpacity}
            min={0}
            max={0.3}
            step={0.01}
            displayValue={`${Math.round(theme.effects.shadowOpacity * 100)}%`}
            onChange={(value) => updateEffect("shadowOpacity", value)}
            onReset={() => resetEffect("shadowOpacity")}
          />
          <RangeControl
            label="Shadow softness"
            value={theme.effects.shadowBlur}
            originalValue={ACCEPTED_THEME.effects.shadowBlur}
            min={8}
            max={68}
            step={1}
            displayValue={`${theme.effects.shadowBlur}px`}
            onChange={(value) => updateEffect("shadowBlur", value)}
            onReset={() => resetEffect("shadowBlur")}
          />
          <RangeControl
            label="Border visibility"
            value={theme.effects.borderOpacity}
            originalValue={ACCEPTED_THEME.effects.borderOpacity}
            min={0}
            max={1}
            step={0.01}
            displayValue={`${Math.round(theme.effects.borderOpacity * 100)}%`}
            onChange={(value) => updateEffect("borderOpacity", value)}
            onReset={() => resetEffect("borderOpacity")}
          />
          <RangeControl
            label="Card curvature"
            value={theme.radii.card}
            originalValue={ACCEPTED_THEME.radii.card}
            min={16}
            max={48}
            step={1}
            displayValue={`${theme.radii.card}px`}
            onChange={(value) => updateRadius("card", value)}
            onReset={() => resetRadius("card")}
          />
          <RangeControl
            label="Nested curvature"
            value={theme.radii.nested}
            originalValue={ACCEPTED_THEME.radii.nested}
            min={14}
            max={44}
            step={1}
            displayValue={`${theme.radii.nested}px`}
            onChange={(value) => updateRadius("nested", value)}
            onReset={() => resetRadius("nested")}
          />
          <RangeControl
            label="Dock curvature"
            value={theme.radii.dock}
            originalValue={ACCEPTED_THEME.radii.dock}
            min={28}
            max={64}
            step={1}
            displayValue={`${theme.radii.dock}px`}
            onChange={(value) => updateRadius("dock", value)}
            onReset={() => resetRadius("dock")}
          />
          <div className="surface-note">
            <span /><p><strong>Continuous curvature</strong> uses squircle-style corners where supported, with a precise rounded fallback.</p>
          </div>
        </section>

        <section className="panel-section json-section">
          <div className="section-title"><span>Chat-ready JSON</span><small>{message}</small></div>
          <p>Copy this into the chat later; it contains every active visual token.</p>
          <textarea value={jsonDraft || exportJson} onChange={(event) => setJsonDraft(event.target.value)} spellCheck={false} />
          <div className="json-actions">
            <button className="primary-action" onClick={copyJson}><Copy size={16} /> Copy JSON</button>
            <button onClick={applyJson}><Check size={16} /> Apply</button>
            <button
              disabled={!jsonDraft}
              aria-label="Revert JSON draft"
              onClick={() => setJsonDraft("")}
            ><RotateCcw size={16} /> Revert</button>
            <button aria-label="Download JSON" onClick={downloadJson}><Download size={16} /></button>
          </div>
        </section>
      </aside>
    </div>
  );
}
