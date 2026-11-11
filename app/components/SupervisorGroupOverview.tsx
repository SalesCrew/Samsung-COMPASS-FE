'use client';

import {useRef,useState} from 'react';
import {ArrowLeft,ChevronRight} from 'lucide-react';
import type {GroupAverageMetric,GroupAverageMonth,GroupMean,SupervisorGroupData} from '../lib/supervisorGroup';
import {DA_SETTINGS} from '../lib/groups';
import {monthName,publicationDate} from '../lib/monthlyClosing';
import {PhoneSelect} from './PhoneSelect';
import {KPIReleaseCountdown} from './KPIReleaseCountdown';
import './supervisorGroup.css';

const number=(value:number)=>value.toLocaleString('de-AT',{maximumFractionDigits:1});
const coverage=(value:GroupMean)=>`${value.known} von ${value.total} SEC`;
const settingLabel=(setting:string)=>DA_SETTINGS.find(s=>s.value===setting)?.label??setting;

function MeanValue({label,mean,unit='',money=false,threshold=false}:{label:string;mean:GroupMean;unit?:string;money?:boolean;threshold?:boolean}){
 return <div className="group-mean"><span>{label}</span><strong data-tone={mean.value===null?'missing':threshold?mean.value>=90?'positive':'warning':money&&mean.value>0?'positive':'default'}>{mean.value===null?'—':mean.value.toLocaleString('de-AT',{maximumFractionDigits:unit==='€'?2:1})}{mean.value!==null&&unit&&<small>{unit}</small>}</strong><small>{coverage(mean)}</small></div>;
}

export function SupervisorGroupOverview({data}:{data:SupervisorGroupData}){
 const[selectedMonth,setSelectedMonth]=useState('');
 const selected=data.months.find(m=>m.month===selectedMonth)??data.months.at(-1);
 const through=selected?.month??data.calendarDay.slice(0,7);
 const history=data.months.filter(m=>m.month<=through&&(!selected||m.month>=selected.rolling.fromMonth));
 const weekly=data.weekly.stands.at(-1);
 const isST=data.groupId==='ST';
 return <div className="fieldforce-dashboard supervisor-group-view" data-testid="supervisor-group" data-group={data.groupId}>
  <header className="group-overview-heading"><h1>Gruppendurchschnitt</h1><p>Je SEC einmal · nur veröffentlichte Werte</p>{data.months.length>0&&<div className="group-month-field"><span>Monatsabschluss</span><PhoneSelect ariaLabel="Gruppen-Berichtsmonat" value={through} onChange={setSelectedMonth} options={[...data.months].reverse().map(m=>({value:m.month,label:monthName(m.month)}))}/></div>}</header>
  <div className="group-overview-cards">
   <KPIReleaseCountdown calendarDay={data.calendarDay}/>
   {selected?<>
    <section className="configured-card group-average-summary" aria-label="Durchschnittliches Monatsergebnis">
     <header className="group-card-heading"><h2>{monthName(selected.month)}</h2><span>{selected.reported} / {data.members} SEC mit Abschluss</span></header>
     <div className="group-mean-grid">{!isST&&<MeanValue label="Ø Sell-out" mean={selected.sellout} unit="%" threshold/>}<MeanValue label="Ø Softbonus" mean={selected.softbonus} unit="%" threshold/></div>
     {!isST&&<p className="group-coverage-note">Ø Monatspunkte: <b>{selected.points.value===null?'—':number(selected.points.value)}</b> · {coverage(selected.points)}</p>}
     {selected.publishedAt&&<p className="group-coverage-note">Zuletzt veröffentlicht am {publicationDate(selected.publishedAt)}</p>}
    </section>
    {!isST&&<section className="configured-card" aria-label="Durchschnittliche Monatsprämien"><header className="group-card-heading"><h2>Monatsprämien</h2><span>Durchschnitt je SEC</span></header><div className="group-mean-grid"><MeanValue label="Ø Hauptprämie" mean={selected.premium} unit="€" money/><MeanValue label="Ø Zusatzprämie" mean={selected.extras} unit="€"/></div></section>}
    {!isST&&<section className="configured-card" aria-label="Gruppenwerte der letzten zwölf Monate"><header className="group-card-heading"><h2>Letzte 12 Monate</h2><span>{monthName(selected.rolling.fromMonth)} – {monthName(selected.month)}</span></header><MeanValue label="Ø Punkte" mean={selected.rolling.points}/><div className="group-level-distribution" aria-label="SEC-Level Verteilung">{(['SEC','SEC+','SEC Pro'] as const).map((level,index)=><div key={level} data-level={index}><span>{level}</span><strong>{selected.rolling.levels[level]}</strong></div>)}</div>{selected.rolling.levels.unknown>0&&<p className="group-coverage-note">SEC-Level bei {selected.rolling.levels.unknown} SEC noch offen.</p>}<div className="group-mean-grid group-rolling-premiums"><MeanValue label="Ø Hauptprämie" mean={selected.rolling.premium} unit="€" money/><MeanValue label="Ø Zusatzprämie" mean={selected.rolling.extras} unit="€"/></div><p className="group-coverage-note">Punkte und Prämien: Durchschnitt der vollständigen Zwölfmonatsstände.</p></section>}
    {!isST&&<GroupMetricSection key={through+'-kpi'} title="KPIs im Durchschnitt" metrics={selected.metrics} division={data.groupId} histories={history.map(m=>({date:m.month,metrics:m.metrics}))}/>}
    <GroupMetricSection key={through+'-criteria'} title={isST?'Bewertung im Durchschnitt':'Softbonus im Durchschnitt'} metrics={selected.qualitative} division={data.groupId} histories={history.map(m=>({date:m.month,metrics:m.qualitative}))}/>
    <GroupTrend history={history} isST={isST}/>
   </>:<section className="configured-card group-no-data"><h2>Noch kein Monatsabschluss</h2><p>Für diese Gruppe wurden noch keine Abschlüsse veröffentlicht.</p></section>}
   <section className="group-weekly-section" aria-label="Durchschnittliche monatliche Ziele"><header className="group-section-heading"><h2>Monatliche Ziele</h2><p>{monthName(data.weekly.month)} · wöchentliche Stände</p></header>{weekly?<><p className="group-weekly-date">Datenstand {publicationDate(weekly.asOf+'T12:00:00Z')} · aktualisiert {publicationDate(weekly.updatedAt)}</p><GroupMetricSection key={weekly.asOf+'-weekly'} title="Ziele im Durchschnitt" metrics={weekly.metrics} division={data.groupId} histories={data.weekly.stands.map(s=>({date:s.asOf,metrics:s.metrics}))} weekly/></>:<div className="configured-card group-no-data"><p>Für {monthName(data.weekly.month)} liegen noch keine Monatsziele vor.</p></div>}</section>
   <p className="group-explanation">Arithmetischer Durchschnitt je SEC. Fehlende, ungültige oder widersprüchliche Werte bleiben offen. Die Angabe je Wert zeigt die verfügbare Datenbasis.</p>
  </div>
 </div>;
}

function GroupMetricSection({title,metrics,division,histories,weekly=false}:{title:string;metrics:GroupAverageMetric[];division:string;histories:{date:string;metrics:GroupAverageMetric[]}[];weekly?:boolean}){
 const[selected,setSelected]=useState<string|null>(null),back=useRef<HTMLButtonElement>(null),overview=useRef<HTMLDivElement>(null);
 const detail=metrics.find(m=>m.id===selected);
 function close(){const id=selected;setSelected(null);requestAnimationFrame(()=>Array.from(overview.current?.querySelectorAll<HTMLButtonElement>('button')??[]).find(button=>button.dataset.metricId===id)?.focus({preventScroll:true}));}
 const dateLabel=(date:string)=>date.length===7?monthName(date,true)+' '+date.slice(2,4):publicationDate(date+'T12:00:00Z');
 return <section className="configured-card group-metric-section" aria-label={title} onKeyDown={event=>{if(event.key==='Escape'&&detail){event.preventDefault();close();}}}>
  <header className="group-card-heading"><h2>{title}</h2><span>{metrics.length} {weekly?'Ziele':'Kennzahlen'}</span></header>
  {detail?<div className="group-metric-detail"><button type="button" className="group-back" ref={back} onClick={close}><ArrowLeft size={16}/>Zur Übersicht</button><h3>{detail.label}</h3>{division==='DA'&&<p className="group-coverage-note">{settingLabel(detail.setting)}</p>}<MeanValue label="Ø Zielerreichung" mean={detail.achievement} unit="%" threshold/>{(detail.actual.value!==null||detail.target.value!==null)&&<div className="group-mean-grid"><MeanValue label="Ø Ist" mean={detail.actual} unit={detail.unit}/><MeanValue label="Ø Ziel" mean={detail.target} unit={detail.unit}/></div>}
   {!!detail.details?.length&&<dl className="group-detail-values">{detail.details.map(item=><div key={item.id}><dt>{item.label}</dt><dd data-tone={item.achievement.value===null?'missing':item.achievement.value>=90?'positive':'warning'}>{item.achievement.value===null?'—':number(item.achievement.value)+'%'}<small>{coverage(item.achievement)}</small></dd></div>)}</dl>}
   <div className="group-table-scroll"><table className="group-history-table"><caption>{weekly?'Wochenverlauf · kumulierter Monatsstand':'Monatsverlauf im Durchschnitt'}</caption><thead><tr><th scope="col">Stand</th>{weekly&&<th scope="col">Ø Ist / Ziel</th>}<th scope="col">Ø Erreicht</th></tr></thead><tbody>{histories.map(row=>{const metric=row.metrics.find(m=>m.id===detail.id);return <tr key={row.date}><th scope="row">{dateLabel(row.date)}</th>{weekly&&<td>{metric?.actual.value==null?'—':number(metric.actual.value)} / {metric?.target.value==null?'—':number(metric.target.value)}<small>{detail.unit}</small>{metric?.change?.value!=null&&<small className="group-weekly-change" data-tone={metric.change.value>0?'positive':metric.change.value<0?'warning':'default'}>{metric.change.value>0?'+':''}{number(metric.change.value)} {detail.unit==='%'?'Pp.':detail.unit} · {metric.change.known} vergleichbare SEC</small>}</td>}<td>{metric?.achievement.value==null?'—':number(metric.achievement.value)+'%'}<small>{metric?coverage(metric.achievement):'Kein Wert'}</small></td></tr>;})}</tbody></table></div>
  </div>:<div ref={overview} className="group-metric-list">{metrics.map(metric=><button type="button" key={metric.id} data-metric-id={metric.id} onClick={()=>{setSelected(metric.id);requestAnimationFrame(()=>back.current?.focus({preventScroll:true}));}}><span><strong>{metric.label}</strong><small>{[division==='DA'?settingLabel(metric.setting):'',metric.block,coverage(metric.achievement)].filter(Boolean).join(' · ')}</small></span><b data-tone={metric.achievement.value===null?'missing':metric.achievement.value>=90?'positive':'warning'}>{metric.achievement.value===null?'—':number(metric.achievement.value)+'%'}</b><ChevronRight size={15} aria-hidden="true"/></button>)}{!metrics.length&&<p className="group-coverage-note">Noch keine Kennzahlen verfügbar.</p>}</div>}
 </section>;
}

function GroupTrend({history,isST}:{history:GroupAverageMonth[];isST:boolean}){
 const max=Math.max(110,...history.flatMap(m=>[m.sellout.value??0,m.softbonus.value??0]));
 const ordinal=(month:string)=>Number(month.slice(0,4))*12+Number(month.slice(5));
 const start=ordinal(history[0].month),end=ordinal(history.at(-1)!.month);
 const x=(i:number)=>start===end?300:35+(ordinal(history[i].month)-start)*530/(end-start),y=(v:number)=>155-v/max*130;
 const path=(key:'sellout'|'softbonus')=>history.map((m,i)=>m[key].value===null?'':(i&&history[i-1][key].value!==null&&ordinal(m.month)-ordinal(history[i-1].month)===1?'L':'M')+x(i)+','+y(m[key].value!)).join(' ');
 return <section className="configured-card group-trend" aria-label="Durchschnittlicher Monatsverlauf"><header className="group-card-heading"><h2>Monatsverlauf</h2><span>Gruppendurchschnitt</span></header><div className="group-trend-legend">{!isST&&<span><i/>Sell-out</span>}<span><i/>Softbonus</span></div><svg viewBox="0 0 600 200" role="img" aria-label="Verlauf der durchschnittlichen Zielerreichung"><line x1="35" x2="565" y1={y(100)} y2={y(100)} className="group-target-line"/><text x="35" y={y(100)-9}>100%</text>{(!isST?['sellout','softbonus']:['softbonus']).map(key=><g key={key} className={'group-trend-'+key}><path d={path(key as 'sellout'|'softbonus')}/>{history.map((m,i)=>m[key as 'sellout'|'softbonus'].value===null?null:<circle key={m.month} cx={x(i)} cy={y(m[key as 'sellout'|'softbonus'].value!)} r="4"><title>{monthName(m.month)}: {number(m[key as 'sellout'|'softbonus'].value!)}%</title></circle>)}</g>)}{history.map((m,i)=>(i===0||i===history.length-1||i%3===0)&&<text key={m.month} x={x(i)} y="185" textAnchor={i===0?'start':i===history.length-1?'end':'middle'}>{monthName(m.month,true)}</text>)}</svg><details><summary>Monatswerte ansehen</summary><table className="group-history-table"><thead><tr><th scope="col">Monat</th>{!isST&&<th scope="col">Ø Sell-out</th>}<th scope="col">Ø Softbonus</th></tr></thead><tbody>{history.map(row=><tr key={row.month}><th scope="row">{monthName(row.month,true)} {row.month.slice(2,4)}</th>{(!isST?[row.sellout,row.softbonus]:[row.softbonus]).map((m,i)=><td key={i}>{m.value===null?'—':number(m.value)+'%'}<small>{coverage(m)}</small></td>)}</tr>)}</tbody></table></details></section>;
}
