'use client';

import {useEffect,useRef,useState,type FormEvent} from 'react';
import type {Session} from '@supabase/supabase-js';
import {X} from 'lucide-react';
import {secPost} from '../lib/secApi';
import './adminPasswordDialog.css';

export function AdminPasswordDialog({session,onClose,onSaved}:{session:Session;onClose:()=>void;onSaved:()=>Promise<void>}){
 const dialogRef=useRef<HTMLDialogElement>(null);
 const[currentPassword,setCurrentPassword]=useState('');
 const[newPassword,setNewPassword]=useState('');
 const[confirmPassword,setConfirmPassword]=useState('');
 const[error,setError]=useState('');
 const[busy,setBusy]=useState(false);
 useEffect(()=>{
  const dialog=dialogRef.current;
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  dialog?.showModal();
  dialog?.querySelector<HTMLInputElement>('input')?.focus();
  return()=>{dialog?.close();if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy)return;
  if(newPassword!==confirmPassword){setError('Die neuen Passwörter stimmen nicht überein.');return;}
  setBusy(true);setError('');
  try{await secPost('/admin/password',{currentPassword,newPassword,confirmPassword},session);await onSaved();}
  catch(e){setError(e instanceof Error?e.message:'Passwort konnte nicht geändert werden.');}
  finally{setBusy(false);}
 }
 return <dialog ref={dialogRef} className="sec-admin-password-dialog" aria-labelledby="admin-password-title" aria-describedby="admin-password-description" onCancel={event=>{event.preventDefault();if(!busy)onClose();}} onKeyDown={event=>{if(event.key!=='Tab')return;const controls=[...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)')];const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}}>
  <header><h2 id="admin-password-title">Passwort ändern</h2><button type="button" onClick={onClose} disabled={busy} aria-label="Schließen"><X size={18}/></button></header>
  <p id="admin-password-description">Für dein Administratorkonto. Nach dem Speichern meldest du dich erneut an.</p>
  <form onSubmit={submit} aria-busy={busy}>
   <fieldset disabled={busy}>
    <label>Aktuelles Passwort<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} value={currentPassword} onChange={event=>{setCurrentPassword(event.target.value);setError('');}}/></label>
    <label>Neues Passwort<input name="newPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} aria-describedby="admin-password-hint" value={newPassword} onChange={event=>{setNewPassword(event.target.value);setError('');}}/><small id="admin-password-hint">12–128 Zeichen</small></label>
    <label>Neues Passwort wiederholen<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmPassword} onChange={event=>{setConfirmPassword(event.target.value);setError('');}}/></label>
   </fieldset>
   {error&&<p className="sec-admin-password-error" role="alert">{error}</p>}
   <footer><button type="button" onClick={onClose} disabled={busy}>Abbrechen</button><button type="submit" className="sec-admin-password-save" disabled={busy}>{busy?'Speichern…':'Passwort speichern'}</button></footer>
  </form>
 </dialog>;
}
