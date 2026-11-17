import { activeReports, previousMonth, type MonthlyReport } from './monthlyClosing.ts';
import type { SECGroup } from './groups.ts';

export function performanceHistory(reports: readonly MonthlyReport[], through: string, group: SECGroup['id']) {
 const months=[through]; while(months.length<12)months.unshift(previousMonth(months[0]));
 const active=activeReports(reports.filter(r=>r.groupId===group&&r.month>=months[0]&&r.month<=through));
 const byMonth=new Map(active.map(r=>[r.month,r]));
 const finite=(n:number|null|undefined)=>typeof n==='number'&&Number.isFinite(n)?n:null;
 return months.map(month=>{const report=byMonth.get(month);return {month,report,sellout:group==='ST'?null:finite(report?.sellout),softbonus:finite(report?.softbonus)};});
}
export type PerformanceHistoryRow=ReturnType<typeof performanceHistory>[number];
