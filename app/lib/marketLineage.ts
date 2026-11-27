import {monthName} from './monthlyClosing.ts';

export type MarketLineagePeriod={fromMonth:string;throughMonth:string|null;sourceAssignmentId:string;sourceMarket:string;marketAssignmentId:string;market:string};
/** Describe the confirmed market periods, independently of how an original labelled its row. */
export function marketLineageText(periods:readonly MarketLineagePeriod[]|undefined):string|null{
 if(!periods?.length)return null;
 const merged:MarketLineagePeriod[]=[];
 for(const period of [...periods].sort((a,b)=>a.fromMonth.localeCompare(b.fromMonth))){
  const last=merged.at(-1),lastDate=last?.throughMonth?new Date(last.throughMonth+'-01T12:00:00Z'):null;
  if(lastDate)lastDate.setUTCMonth(lastDate.getUTCMonth()+1);
  if(last&&last.marketAssignmentId===period.marketAssignmentId&&lastDate?.toISOString().slice(0,7)===period.fromMonth)last.throughMonth=period.throughMonth;
  else merged.push({...period});
 }
 return merged.map(period=>period.market.replace(/^MM\s+/,'')+(period.throughMonth?' bis '+monthName(period.throughMonth):' ab '+monthName(period.fromMonth))).join(' · ')+'.';
}

