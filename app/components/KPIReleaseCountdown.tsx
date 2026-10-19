import { Clock3 } from 'lucide-react';
import { monthName, nextKPIRelease, publicationDate } from '../lib/monthlyClosing';

export function KPIReleaseCountdown({ calendarDay }: { calendarDay: string }) {
  const release = nextKPIRelease(calendarDay);
  return <section className="configured-card kpi-release-card" aria-label="Zeit bis zu neuen KPIs">
    <header><Clock3 size={25} strokeWidth={1.65} /><h2>{release?.status === 'countdown' ? <>Neue KPIs in <b>{release.daysRemaining} {release.daysRemaining === 1 ? 'Tag' : 'Tagen'}</b></> : release?.status === 'window' ? 'Neue KPIs jeden Moment' : 'Zeit bis zu neuen KPIs'}</h2></header>
    {!release ? <p className="kpi-release-status">Zeitangabe nicht verfügbar</p> : <>
      <p className="kpi-release-caption">Erwartet 15.–20. {monthName(release.date.slice(0,7))}</p>
      <div className="month-timeline-track" role="progressbar" aria-label="Zeit bis zum KPI-Veröffentlichungsfenster" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(release.progress)} aria-valuetext={release.status === 'countdown' ? release.daysRemaining+' Tage bis '+publicationDate(release.date+'T12:00:00Z') : 'Neue KPIs zwischen dem 15. und 20. '+monthName(release.date.slice(0,7))+' erwartet'}><span style={{width:release.progress+'%'}} /></div>
    </>}
  </section>;
}
