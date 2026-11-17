import {readTargetPeriod,targetPeriodLabel,type TargetPeriodCoverage} from '../lib/targetPeriod';
import './targetPeriod.css';

export function TargetPeriodNote({period,coverage,className='target-period-note'}:{period?:unknown;coverage?:TargetPeriodCoverage;className?:string}){
 const value=coverage?.period??readTargetPeriod(period);
 if(coverage?.different)return <span className={className}>Unterschiedliche Zielzeiträume{coverage.known<coverage.total?` · ${coverage.known} von ${coverage.total} SEC mit Zeitraum`:''}</span>;
 if(!value)return null;
 return <span className={className} data-target-period={value.from+'/'+value.through}>Zielzeitraum <time dateTime={value.from}>{targetPeriodLabel(value)}</time>{coverage&&coverage.known<coverage.total?` · ${coverage.known} von ${coverage.total} SEC`:''}</span>;
}
