export type ImportStaffingSource={division:'HE'|'IM';expectedPeople:number;receivedPeople:number;status:'awaiting'|'draft'|'published'|'restricted';asOf:string|null};
export type ImportStaffingProgress={market:string;sources:ImportStaffingSource[];complete:boolean;currentDivision?:'HE'|'IM'};
export function staffingSourceLabel(source:ImportStaffingSource,currentDivision?:string){
 const people=`${source.expectedPeople} ${source.expectedPeople===1?'Person':'Personen'}`;
 if(source.division===currentDivision)return`${people} · diese Datei`;
 if(source.status==='restricted')return'Status außerhalb deines Bereichs';
 if(source.status==='awaiting')return`${people} · Liste noch ausstehend`;
 return`${source.receivedPeople} ${source.receivedPeople===1?'Person':'Personen'} · ${source.status==='draft'?'Entwurf gespeichert':'veröffentlicht'}`;
}
