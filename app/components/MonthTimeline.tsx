import { Clock3 } from 'lucide-react';
import { MONTHS, monthTimeline, shortDate } from '../lib/dashboard';
import { calendarTimeline, monthName } from '../lib/monthlyClosing';

export function MonthTimeline({ month: reportMonth, asOf: cutoff, calendarDay }: { month?: string; asOf?: string; calendarDay?: string }) {
  const calendar = calendarDay ? calendarTimeline(calendarDay) : null;
  if (calendarDay && !calendar) return <p>Monatszeit nicht verfügbar</p>;
  const month = calendar?.month ?? reportMonth!;
  const asOf = calendarDay ?? cutoff!;
  const { progress, day, lastDay } = calendar ?? monthTimeline(month, asOf);
  const monthNumber = month.slice(5, 7);
  const monthLabel = calendar ? monthName(month).split(' ')[0] : MONTHS.find(value => value.id === month)?.label ?? month;
  return <div className="month-timeline" role="progressbar" aria-label={`Monatszeit ${monthLabel}: 01.${monthNumber}. bis ${lastDay}.${monthNumber}.`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-valuetext={`Tag ${day} von ${lastDay}; ${calendar ? 'Kalendertag' : 'Datenstand'} ${shortDate(asOf)}`}>
    <div className="month-timeline-caption" aria-hidden="true"><span><Clock3 size={21} strokeWidth={1.7} />Monatszeit · {monthLabel}</span><small>Tag <b>{day}</b> / {lastDay}</small></div>
    <div className="month-timeline-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
    <div className="month-timeline-ends" aria-hidden="true"><span>01.{monthNumber}.</span><span>{calendar ? 'Kalendertag' : 'Stand'} {shortDate(asOf)}</span><span>{lastDay}.{monthNumber}.</span></div>
  </div>;
}
