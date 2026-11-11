import type { AdminMetric, ImportPhase, SheetPreview, SourceColumnMapping } from './admin.ts';
import { closingDefinitions, closingMappings } from './closingImport.ts';
import type { SECGroup } from './groups.ts';

export type ImportIssue = { row: number; column?: string; field?: string; message: string };
export type ImportProblem = { title: string; solution: string; target: string; location?: string };
export type FeedbackContext = { sheet?: SheetPreview; mappings: SourceColumnMapping[]; metrics: AdminMetric[] };
export const importFieldId = (field: string) => 'import-field-' + encodeURIComponent(field);

export function fieldLabel(field: string, ctx: FeedbackContext): string {
  const known: Record<string, string> = { 'person.name': 'Name', 'person.externalId': 'SEC-ID', 'assignment.market': 'Markt', 'snapshot.reportMonth': 'Berichtsmonat', 'sellout.overall': 'Zielerreichung gesamt' };
  if (known[field]) return known[field];
  const metric = ctx.metrics.find(m => field === m.id + '.target' || field === m.id + '.actual');
  if (metric) return metric.label + (field.endsWith('.target') ? ' · Monatsziel' : ' · Istwert');
  const mapping = ctx.mappings.find(m => m.field === field);
  return mapping?.sourceLabel.replace(/ · (?:Ziel|Target)$/, ' · Monatsziel') || 'Kennzahl';
}

export function weeklyFields(metrics: AdminMetric[], group: SECGroup['id'], mappings: SourceColumnMapping[]): SourceColumnMapping[] {
  const base: SourceColumnMapping[] = [
    { field: 'person.externalId', sourceLabel: 'SEC-ID', dataset: 'identity', dataType: 'text', required: false, column: '' },
    { field: 'person.name', sourceLabel: 'Name', dataset: 'identity', dataType: 'text', required: false, column: '' },
    { field: 'assignment.market', sourceLabel: 'Markt', dataset: 'assignment', dataType: 'text', required: false, column: '' },
    ...metrics.filter(m => m.active && (m.dataset !== 'softbonus' || group === 'ST')).flatMap(m => (['target', 'actual'] as const).map(suffix => ({ field: m.id + '.' + suffix, sourceLabel: m.label + (suffix === 'target' ? ' · Monatsziel' : ' · Istwert'), dataset: 'sellout' as const, dataType: m.unit === '%' ? 'percent' as const : m.unit === '€' ? 'currency' as const : 'number' as const, required: suffix === 'target', column: '' }))),
  ];
  const fields = new Set(base.map(m => m.field));
  return [...base.map(def => ({ ...def, ...mappings.find(m => m.field === def.field && m.dataset !== 'ignore'), sourceLabel: def.sourceLabel })), ...mappings.filter(m => m.dataset !== 'ignore' && m.field && !fields.has(m.field))];
}

/** Retain explicit choices across date/config changes; newly required fields stay unassigned. */
export function closingFeedbackMappings(ctx: FeedbackContext, group: SECGroup['id']): SourceColumnMapping[] {
  if (!ctx.sheet) return ctx.mappings;
  return [...ctx.mappings, ...closingMappings(ctx.sheet, group, ctx.metrics).filter(next => !ctx.mappings.some(item => item.id === next.id && item.field === next.field)).map(item => ({ ...item, column: '' }))];
}

export function mappingProblems(ctx: FeedbackContext, group: SECGroup['id'], closing: boolean): ImportProblem[] {
  if (!ctx.sheet) return [];
  const active = ctx.mappings.filter(m => m.dataset !== 'ignore');
  const required = closing ? closingDefinitions(group, ctx.metrics).filter(d => d.required).map(d => ({ field: d.field, label: d.label }))
    : weeklyFields(ctx.metrics, group, ctx.mappings).filter(d => d.field.endsWith('.target')).map(d => ({ field: d.field, label: fieldLabel(d.field, ctx) }));
  const problems: ImportProblem[] = [];
  for (const def of required) {
    if (!active.some(m => m.field === def.field && m.column)) problems.push({ title: `${def.label}: Excel-Spalte fehlt.`, solution: `${closing && ctx.mappings.some(m => m.field === def.field && m.dataset === 'ignore') ? 'Aktiviere bei diesem Feld „Übernehmen“. ' : ''}Wähle in diesem Feld die Excel-Spalte für „${def.label}“. Fehlt sie in der Datei, ergänze sie in Excel, speichere die Datei und wähle sie erneut aus.`, target: def.field });
  }
  if (!closing && !active.some(m => m.column && ['person.externalId', 'person.name', 'assignment.market'].includes(m.field))) problems.push({ title: 'Die Personen können noch nicht erkannt werden.', solution: 'Ordne mindestens eine Spalte für SEC-ID, Name oder Markt zu. Mit SEC-ID, Name und Markt lässt sich die Zuordnung am besten prüfen.', target: 'person.externalId' });
  for (const m of active.filter(m => m.column)) {
    if (!ctx.sheet.columns.some(c => c.key === m.column)) problems.push({ title: `${fieldLabel(m.field, ctx)}: Spalte ${m.column} gibt es in diesem Blatt nicht.`, solution: 'Wähle eine vorhandene Spalte aus der Liste. Prüfe bei Bedarf oben das Arbeitsblatt.', target: m.field });
    if (active.some(other => other !== m && other.column === m.column)) problems.push({ title: `Spalte ${m.column} ist mehrfach zugeordnet.`, solution: `Wähle für „${fieldLabel(m.field, ctx)}“ eine eigene Excel-Spalte. Korrigiere die andere Zuordnung, falls diese falsch ist.`, target: m.field });
    if (active.some(other => other !== m && other.field === m.field)) problems.push({ title: `${fieldLabel(m.field, ctx)} ist mehrfach zugeordnet.`, solution: 'Verwende für diesen Wert nur eine Quellspalte. Entferne die zusätzliche Zuordnung.', target: m.field });
  }
  if (closing) for (const m of active.filter(m => !m.column && !required.some(d => d.field === m.field))) problems.push({ title: `${fieldLabel(m.field, ctx)}: Excel-Spalte fehlt.`, solution: 'Wähle die passende Quellspalte. Wird dieses optionale Feld nicht geliefert, deaktiviere „Übernehmen“.', target: m.field });
  return problems;
}

export function explainImportIssue(issue: ImportIssue, ctx: FeedbackContext): ImportProblem {
  const msg = issue.message;
  const field = issue.field || msg.match(/^Pflichtzuordnung fehlt:\s*(.+)$/)?.[1] || ctx.mappings.find(m => m.dataset !== 'ignore' && m.column && m.column === issue.column)?.field;
  const target = field || (issue.row ? `person-row:${issue.row}` : 'mapping');
  const label = field ? fieldLabel(field, ctx) : 'Wert';
  const location = issue.row > 0 ? `${ctx.sheet?.name ? `Blatt „${ctx.sheet.name}“ · ` : ''}${issue.column ? `Zelle ${issue.column}${issue.row}` : `Excel-Zeile ${issue.row}`}` : undefined;
  const result = (title: string, solution: string, nextTarget = target): ImportProblem => ({ title, solution, target: nextTarget, location });
  if (/Pflichtzuordnung fehlt/.test(msg)) return result(`${label}: Excel-Spalte fehlt.`, `Wähle in diesem Feld die Excel-Spalte für „${label}“. Fehlt sie in der Datei, ergänze sie in Excel, speichere die Datei und wähle sie erneut aus.`);
  if (/EDI-Zeitraum/.test(msg)) return /Monat/.test(msg) ? result('Der Berichtsmonat passt nicht zur Datei.', 'Wähle unter „Berichtsmonat“ den Monat aus dem EDI-Zeitraum im Kopf der Excel-Datei. Prüfe danach die Daten erneut.', 'month') : result('Der Datenstand passt nicht zur Datei.', 'Wähle unter „Datenstand“ das Enddatum des EDI-Zeitraums im Kopf der Excel-Datei. Prüfe danach die Daten erneut.', 'asOf');
  if (/Wochenliste darf|Pivot Liste ist ein Monatsabschluss/.test(msg)) return result('Datei und Importphase passen nicht zusammen.', 'Für eine Wochenliste wähle „Weekly Progress“, für eine reine Zielbasis „Monatsstart · Targets“. Für einen Monatsabschluss wähle das Blatt „Pivot Liste“ und die Phase „Monatsabschluss“.', 'phase');
  if (/Targetbasis enthält/.test(msg)) return result('Die Datei enthält bereits verkaufte Mengen oder andere Istwerte.', 'Wähle die Phase „Weekly Progress“, wenn du den Wochenstand importieren möchtest. Für eine reine Zielbasis verwende eine Datei ohne Istwerte.', 'phase');
  if (/Quellspalte ist mehrfach|Spaltenkonflikt/.test(msg)) return result(issue.column ? `Spalte ${issue.column} ist mehrfach zugeordnet.` : 'Eine Excel-Spalte wird mehrfach verwendet.', 'Jeder Wert braucht eine eigene Quellspalte. Korrigiere die markierten Zuordnungen.');
  if (/Quellspalte fehlt|Pflichtfelder fehlen|Spalte wählen|Importziel|Name, SEC-ID oder Markt/.test(msg)) return result('Die Spaltenzuordnung ist noch unvollständig.', 'Ordne die markierten Felder einer vorhandenen Excel-Spalte zu. SEC-ID, Name oder Markt müssen die Person erkennbar machen.');
  if (/Doppelter|Mehrere Zeilen wurden/.test(msg)) return result('Eine Person mit diesem Markt kommt mehrfach vor.', 'Prüfe die genannte Zeile und die übrigen Zeilen für dieselbe Person und denselben Markt. Behalte je Datenstand nur einen Datensatz und lade die korrigierte Datei erneut hoch.', 'source');
  if (/Markt ist nicht eindeutig/.test(msg)) return result('Der Markt für diese Person ist nicht eindeutig.', 'Ordne die Excel-Spalte mit dem Markt zu. Fehlt der Markt in der Datei, ergänze ihn dort und wähle die gespeicherte Datei erneut aus.', 'assignment.market');
  if (/Person|SEC-ID.*(?:gehört|Name|gewählte)|Markt hat mehrere/.test(msg) && !issue.column) return result('Die Person muss noch bestätigt werden.', /widersprechen|gehört bereits/.test(msg) ? 'SEC-ID und ausgewählte Person passen nicht zusammen. Prüfe SEC-ID und Namen in der genannten Excel-Zeile, korrigiere sie bei Bedarf und lade die Datei erneut hoch.' : /neue Person/.test(msg) ? 'Ergänze SEC-ID, Name und Markt in der genannten Excel-Zeile. Lade die gespeicherte Datei erneut hoch und bestätige die Zuordnung.' : 'Wähle unter „Personen zuordnen“ für diese Zeile die richtige Person. Prüfe SEC-ID, Namen und Markt in der Datei, falls niemand passt. Klicke danach auf „Daten prüfen“.');
  if (/Excel-Fehler|Formel ohne/.test(msg)) return result(`${label}: Excel kann den Zellwert nicht liefern.`, 'Öffne die genannte Zelle in Excel. Behebe den Formelfehler bzw. lass die Formel neu berechnen. Speichere die Datei und wähle sie hier erneut aus.');
  if (/Monat fehlt|Excel-Datum/.test(msg)) return result('In der Excel-Zeile fehlt ein gültiger Monat.', 'Trage in der genannten Zelle den richtigen Monat als Excel-Datum oder im Format JJJJ-MM ein. Speichere die Datei und wähle sie erneut aus.');
  if (/Monatsziel fehlt|Pflichtwert fehlt/.test(msg)) return result(`${label}: Pflichtwert fehlt oder ist ungültig.`, `Trage den richtigen Wert in der genannten Excel-Zelle ein${/Monatsziel/.test(msg) ? ' (eine Zahl ab 0)' : ''}. Verwende 0 nur, wenn der Wert tatsächlich 0 ist. Speichere die Datei und wähle sie erneut aus.`);
  if (/ungültig|nicht lesbar/.test(msg)) return result(`${label}: Der Wert kann nicht als Zahl gelesen werden.`, 'Prüfe die genannte Excel-Zelle. Trage eine gültige Zahl ohne zusätzlichen Text ein, z. B. 50 oder 95 %. Negative Istwerte sind nicht erlaubt. Speichere die Datei und wähle sie erneut aus.');
  return result('Dieser Eintrag konnte nicht geprüft werden.', 'Prüfe die genannte Zeile, die ausgewählten Spalten und den Berichtsmonat. Lade eine korrigierte Datei erneut hoch und klicke auf „Daten prüfen“. Bleibt der Fehler bestehen, sende dem Support einen Screenshot dieses Hinweises.');
}

export function contextProblems(month: string, asOf: string, phase: ImportPhase, sheet?: SheetPreview, today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Vienna' })): ImportProblem[] {
  const problems: ImportProblem[] = [];
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) problems.push({ title: 'Der Berichtsmonat fehlt.', solution: 'Wähle den Monat, zu dem die Excel-Daten gehören.', target: 'month' });
  const date = new Date(asOf + 'T12:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || !Number.isFinite(date.valueOf()) || date.toISOString().slice(0,10) !== asOf) problems.push({ title: 'Ein gültiger Datenstand fehlt.', solution: 'Wähle das Datum, bis zu dem die Werte in der Datei erfasst wurden.', target: 'asOf' });
  else if (!asOf.startsWith(month)) problems.push({ title: 'Datenstand und Berichtsmonat passen nicht zusammen.', solution: 'Wähle einen Datenstand innerhalb des Berichtsmonats. Maßgeblich ist der Zeitraum in der Excel-Datei.', target: 'asOf' });
  else if (asOf > today) problems.push({ title: 'Der Datenstand liegt in der Zukunft.', solution: 'Wähle das tatsächliche Erfassungsdatum aus der Excel-Datei. Zukünftige Datenstände können nicht importiert werden.', target: 'asOf' });
  if (sheet && /pivot[\s_-]*liste/i.test(sheet.name) !== (phase === 'MONTH_FINALIZATION')) problems.push(explainImportIssue({ row: 0, message: 'Pivot Liste ist ein Monatsabschluss.' }, { sheet, mappings: [], metrics: [] }));
  return problems;
}

export function explainImportFailure(message: string): ImportProblem {
  const problem = (title: string, solution: string, target = 'source') => ({ title, solution, target });
  if (/abgelaufen.*Datei|Importvorschau.*abgelaufen/.test(message)) return problem('Die Dateivorschau ist abgelaufen.', 'Wähle dieselbe Excel-Datei oben erneut aus. Die Vorschau ist nach 20 Minuten oder einem Serverneustart nicht mehr verfügbar. Prüfe danach die Zuordnung erneut.');
  if (/Arbeitsblatt fehlt/.test(message)) return problem('Es ist kein gültiges Arbeitsblatt ausgewählt.', 'Wähle oben unter „Arbeitsblatt“ das Blatt mit den Importdaten. Für Monatsabschlüsse verwende „Pivot Liste“.', 'sheet');
  if (/Obergruppe|Konfiguration passt/.test(message)) return problem('Die Obergruppe oder Zuordnung passt nicht zur Datei.', 'Wähle die Division aus der Excel-Datei, z. B. HE oder IM. Prüfe bei HA / DA auch das DA-Setting. Prüfe die Daten danach erneut.', 'group');
  if (/Berichtsmonat|Datenstichtag|Datenstand/.test(message)) return problem('Bitte prüfe Monat und Datenstand.', 'Wähle den Monat aus der Datei und einen gültigen Datenstand innerhalb dieses Monats. Das Datum darf nicht in der Zukunft liegen.', 'asOf');
  if (/Pivot Liste|Importphase|Wochenliste/.test(message)) return explainImportIssue({ row: 0, message: 'Pivot Liste ist ein Monatsabschluss.' }, { mappings: [], metrics: [] });
  if (/anmelden|Sitzung/.test(message)) return problem('Deine Anmeldung ist abgelaufen.', 'Melde dich erneut an und wähle die Excel-Datei nochmals aus. Bereits veröffentlichte Daten bleiben erhalten.');
  if (/Rechte|freigeschaltet|deaktiviert|zweiten Faktor|Passwort ändern/.test(message)) return problem('Dieser Import ist für deinen Zugang noch nicht freigegeben.', 'Prüfe deine Anmeldung und die gewählte Division. Bitte einen Administrator, deinen Zugang bzw. die Berechtigung für diese Division zu prüfen.');
  if (/ausgelastet|Zu viele An/.test(message)) return problem('Die Prüfung ist gerade ausgelastet.', 'Warte einen Moment und klicke erneut auf „Daten prüfen“. Wähle die Datei erneut aus, falls die Vorschau inzwischen abgelaufen ist.');
  if (/Excel|Dateiteil|XML|Arbeitsblätter|Zeilen|Spalten|Datei|groß|ZIP|zip/.test(message)) return problem('Die Excel-Datei konnte nicht eingelesen werden.', /groß|30 MB|Zeilen|Spalten/.test(message) ? 'Verwende eine .xlsx- oder .xlsm-Datei bis 30 MB mit nur den benötigten Daten (höchstens 50.000 Zeilen und 512 Spalten je Blatt). Speichere die kleinere Datei in Excel und wähle sie erneut aus.' : 'Öffne die Datei in Excel und speichere sie als neue .xlsx-Datei. Wähle diese neue Datei hier aus. Eine umbenannte CSV- oder beschädigte Datei reicht nicht aus.');
  return problem('Die Anfrage konnte nicht abgeschlossen werden.', 'Prüfe deine Internetverbindung und versuche denselben Schritt erneut. Wähle die Datei erneut aus, falls die Vorschau abgelaufen ist. Bleibt der Fehler bestehen, sende dem Support einen Screenshot.');
}

export function uniqueProblems(problems: ImportProblem[]): ImportProblem[] {
  const seen = new Set<string>();
  return problems.filter(problem => { const key = JSON.stringify([problem.target, problem.title, problem.location]); if (seen.has(key)) return false; seen.add(key); return true; });
}
