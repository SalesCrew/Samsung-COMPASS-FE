# Wissenstest und Mystery Shopping

Die im COMPASS-Meeting vom 16.11.2026 bestätigte monatliche Abwechslung wird anhand des **ausgewählten Abschlussmonats** angezeigt:

| Monat | Aktuelles Kriterium | Nächsten Monat dran |
|---|---|---|
| Gerade | Wissenstest | Mystery Shopping |
| Ungerade | Mystery Shopping | Wissenstest |

Die Phase wurde am 17.11.2026 an den 15 Originalabschlüssen Juni/August/September 2026 für HA/DA, HE, IM, LH und ST geprüft. In `Pivot Liste` stehen Monat, Wissenstest und Mystery Shopping in M/N/O, Kopfzeile 2. Die historischen Zeilen umfassen Juli 2025 bis September 2026: Ergebnis im aktuellen Kriterium, `x` im anderen. Das ist ein Abgleich gelieferter Daten, kein in den Dateien ausdrücklich formulierter Masterkalender. Vor dem belegten Zeitraum wird kein Plan unterstellt. Die bestätigte monatliche Abwechslung wird danach fortgeführt.

Die Originale bleiben unverändert und liefern keine öffentlichen Personenfixtures. Der datierte lokale Auditnachweis `COMPASS Assessment-Turnus 2026-11-17.md` enthält Dateihashes, geprüfte Bereiche und den Umfang des zusätzlichen Freitext-/Kommentarscans.

## Vorrang gelieferter Daten

- Echte Ergebnisse, einschließlich 0 %, haben Vorrang. Im DA-Original für August 2025 gibt es eine Zeile mit Ergebnissen in beiden Spalten; beide bleiben erhalten.
- `x` in beiden Kriterien (ST Mai 2026) belegt keine Teilnahme. Es wird kein nächster persönlicher Termin erfunden.
- Ein aktuell fehlendes Ergebnis bleibt ausstehend, ein ungültiges bleibt ungültig. Nur die bekannte zukünftige Gegenspalte wird separat als nächster Termin erklärt.
- Deaktivierte, nicht zugeordnete oder fremde Kriterien werden nicht ergänzt. E4Y-/Elektro-Köck-Anwendbarkeit bleibt unverändert.
- Eigene Zellkommentare bleiben beim zugehörigen Kriterium.

Der Hinweis ist eine reine Anzeigeprojektion, kein aktuelles bewertetes Kriterium. Gespeicherte Ergebnisse, Gewichtung, Gesamtwerte, Gruppendurchschnitte, Punkte, Prämien und Weekly-Daten ändern sich nicht. SEC und Supervisoren verwenden dieselbe persönliche Komponente. Das vorhandene kombinierte Modell erhält den passenden Namen; ausdrücklich gelieferte abweichende Namen bleiben maßgeblich. Wissenstest und Mystery Shopping werden nicht als gleiches Kriterium mit einer Vormonatsdifferenz verglichen.

Regressionstests: `tests/assessment-schedule.test.mjs`, einschließlich vollständiger ST-Monatsansicht. Zusätzlich Browser-/API-Abnahme der realen persönlichen Ansichten aller fünf Divisionen.
