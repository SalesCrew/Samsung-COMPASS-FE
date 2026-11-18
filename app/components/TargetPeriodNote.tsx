import {readTargetPeriod,targetPeriodLabel,type TargetPeriodCoverage} from '../lib/targetPeriod';
import './targetPeriod.css';

export function TargetPeriodNote({period,coverage,showMissing=false,prefix,className='target-period-note'}:{period?:unknown;coverage?:TargetPeriodCoverage;showMissing?:boolean;prefix?:string;className?:string}){
 const value=coverage?coverage.period:readTargetPeriod(period),label=prefix?prefix+' · ':'';
 if(coverage?.different)return <span role="note" className={className} data-target-period-state="different">{label}Unterschiedliche Zielzeiträume hinterlegt</span>;
 if(!value)return showMissing?<span role="note" className={className} data-target-period-state="missing">{label}Zielzeitraum noch nicht hinterlegt</span>:null;
 return <span role="note" className={className} data-target-period-state={coverage&&coverage.known<coverage.total?'partial':'known'} data-target-period={value.from+'/'+value.through}>{label}Zielzeitraum <time dateTime={value.from}>{targetPeriodLabel(value)}</time>{coverage&&coverage.known<coverage.total?` · ${coverage.known} von ${coverage.total} SEC`:''}</span>;
}
