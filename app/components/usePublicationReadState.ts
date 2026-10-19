'use client';
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { publicationReadKey, type GroupId, type MonthlyReport } from '../lib/monthlyClosing';
import type { DASetting } from '../lib/groups';
const memory = new Map<string, string>();
const eventName = 'sec-monthly-read-change';
function stored(key: string) {
  try { return localStorage.getItem(key) ?? memory.get(key) ?? '[]'; }
  catch { return memory.get(key) ?? '[]'; }
}
function parse(value: string): string[] {
  try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string' && id.startsWith('demo-')).slice(-1000) : []; }
  catch { return []; }
}
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback); window.addEventListener(eventName, callback);
  return () => { window.removeEventListener('storage', callback); window.removeEventListener(eventName, callback); };
}
export function usePublicationReadState(group: GroupId, setting: DASetting, remote?: { ids: readonly string[]; acknowledge: (reports: readonly MonthlyReport[]) => void }) {
  const key = publicationReadKey(group, setting);
  const serialized = useSyncExternalStore(subscribe, () => stored(key), () => '[]');
  const read = useMemo(() => new Set(remote?.ids ?? parse(serialized)), [serialized, remote?.ids]);
  const acknowledge = useCallback((reports: readonly MonthlyReport[]) => {
    if (remote) { remote.acknowledge(reports); return; }
    const next = JSON.stringify([...new Set([...parse(stored(key)), ...reports.filter(r => r.groupId === group && r.setting === setting).map(r => r.publicationId)])]);
    memory.set(key, next);
    try { localStorage.setItem(key, next); } catch { /* Session-only acknowledgment when storage is unavailable. */ }
    window.dispatchEvent(new Event(eventName));
  }, [key, group, setting, remote]);
  return { read, acknowledge };
}
