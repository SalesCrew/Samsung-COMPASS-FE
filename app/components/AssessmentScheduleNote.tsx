import type { NextAssessment } from '../lib/assessmentSchedule';
import { monthName } from '../lib/monthlyClosing';
import { SourceComments } from './SourceComments';
import './assessmentSchedule.css';

export function AssessmentScheduleNote({next}:{next:NextAssessment}){
 return <div className="assessment-schedule" data-assessment-next={next.month}>
  <div><strong>{next.label}</strong><span>Nächsten Monat dran · {monthName(next.month)}</span></div>
  <SourceComments comments={next.comments}/>
 </div>;
}
