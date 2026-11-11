'use client';

import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {Check,ChevronDown,Search} from 'lucide-react';
import type {SupervisorPerson} from '../lib/secApi';

const divisions=[
 ['DA','HA / DA · Home Appliances'],['HE','HE · Home Entertainment'],
 ['IM','IM · Mobile'],['LH','LH · Lighthouse'],['ST','ST · SmartThings'],
] as const;
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de-AT');

export function SupervisorSelect({people,value,onChange,loading=false}:{people:SupervisorPerson[];value:string;onChange:(value:string)=>void;loading?:boolean}){
 const id=useId(),listId=id+'-people';
 const container=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),search=useRef<HTMLInputElement>(null);
 const[open,setOpen]=useState(false),[query,setQuery]=useState(''),[active,setActive]=useState(0);
 const selected=people.find(p=>p.assignment_id===value);
 const groups=useMemo(()=>{
  const term=normalize(query.trim());
  return divisions.map(([division,label])=>({division,label,people:people.filter(p=>p.department_id===division&&normalize(p.name+' '+p.market+' '+label).includes(term)).sort((a,b)=>a.name.localeCompare(b.name,'de-AT')||a.market.localeCompare(b.market,'de-AT'))})).filter(g=>g.people.length);
 },[people,query]);
 const options=groups.flatMap(g=>g.people);
 const activeIndex=Math.min(active,Math.max(0,options.length-1));

 useEffect(()=>{
  if(!open)return;
  const outside=(event:PointerEvent)=>{if(!container.current?.contains(event.target as Node))setOpen(false);};
  document.addEventListener('pointerdown',outside);
  const frame=requestAnimationFrame(()=>search.current?.focus({preventScroll:true}));
  return()=>{document.removeEventListener('pointerdown',outside);cancelAnimationFrame(frame);};
 },[open]);
 function close(restore=true){setOpen(false);setQuery('');if(restore)trigger.current?.focus({preventScroll:true});}
 function choose(index:number){const option=options[index];if(option){onChange(option.assignment_id);close();}}
 function move(index:number){setActive(index);requestAnimationFrame(()=>document.getElementById(listId+'-'+index)?.scrollIntoView({block:'nearest'}));}
 function expand(){setQuery('');setActive(0);setOpen(true);}
 function leaveWithTab(backwards:boolean){
  const button=trigger.current;
  const next=backwards?button:Array.from(document.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),[tabindex="0"]')).find(element=>
   button&&Boolean(button.compareDocumentPosition(element)&Node.DOCUMENT_POSITION_FOLLOWING)&&!container.current?.contains(element)&&element.getClientRects().length&&!element.closest('[inert]'));
  close(false);(next??button)?.focus({preventScroll:true});
 }

 return <div className="supervisor-select" ref={container} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))close(false);}} onKeyDown={event=>{
  if(!open)return;
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}
  else if(event.key==='Tab'){event.preventDefault();leaveWithTab(event.shiftKey);}
  else if(event.key==='ArrowDown'||event.key==='ArrowUp'){
   event.preventDefault();if(options.length)move((activeIndex+(event.key==='ArrowDown'?1:-1)+options.length)%options.length);
  }else if(event.key==='Home'||event.key==='End'){event.preventDefault();if(options.length)move(event.key==='Home'?0:options.length-1);}
  else if(event.key==='Enter'){event.preventDefault();choose(activeIndex);}
 }}>
  <button type="button" ref={trigger} className="supervisor-select-trigger" aria-label={'SEC auswählen'+(selected?' · '+selected.name:'')} aria-haspopup="dialog" aria-expanded={open} aria-controls={id+'-menu'} aria-busy={loading} disabled={!people.length}
   onClick={()=>open?close():expand()} onKeyDown={event=>{if(!open&&(event.key==='ArrowDown'||event.key==='ArrowUp')){event.preventDefault();expand();}}}>
   <span><strong>{selected?.name??(loading?'SEC werden geladen…':'SEC auswählen')}</strong><small>{selected?`${selected.department_id==='DA'?'HA / DA':selected.department_id} · ${selected.market}`:loading?'Übersicht wird vorbereitet':'Noch keine SEC verfügbar'}</small></span><ChevronDown size={18} aria-hidden="true"/>
  </button>
  {open&&<div id={id+'-menu'} role="dialog" aria-label="SEC wechseln" className="supervisor-select-menu">
   <div className="supervisor-search"><Search size={16} aria-hidden="true"/><input ref={search} role="combobox" aria-label="SEC suchen" aria-expanded="true" aria-autocomplete="list" aria-controls={listId} aria-activedescendant={options.length?listId+'-'+activeIndex:undefined} placeholder="Name, Markt oder Division" value={query} onChange={e=>{setQuery(e.target.value);setActive(0);}} autoComplete="off"/></div>
   <div id={listId} role="listbox" aria-label="SEC nach Division" className="supervisor-options">
    {groups.map(group=><div key={group.division} role="group" aria-labelledby={id+'-'+group.division}>
     <div className="supervisor-group-label" id={id+'-'+group.division}>{group.label}<span>{group.people.length}</span></div>
     {group.people.map(person=>{const index=options.indexOf(person);return <div role="option" aria-selected={person.assignment_id===value} id={listId+'-'+index} key={person.assignment_id} className={'supervisor-option'+(activeIndex===index?' is-active':'')} onPointerDown={event=>event.preventDefault()} onPointerMove={()=>setActive(index)} onClick={()=>choose(index)}>
      <span><strong>{person.name}</strong><small>{person.market}</small></span>{person.assignment_id===value&&<Check size={16} aria-hidden="true"/>}
     </div>;})}
    </div>)}
    {!options.length&&<p className="supervisor-no-results" role="status">Keine SEC gefunden.</p>}
   </div>
  </div>}
 </div>;
}
