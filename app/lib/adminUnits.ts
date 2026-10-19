// Canonical values stay compatible with existing configuration JSON. The codes
// give future formatting/import consumers an explicit unit definition to use.
export const ADMIN_METRIC_UNITS = [
  { code: 'pieces', value: 'Stück', label: 'Stück', description: 'Anzahl · z. B. TV Units oder Soundbars' },
  { code: 'eur', value: '€', label: '€', description: 'Euro · z. B. durchschnittlicher Verkaufspreis' },
  { code: 'percent', value: '%', label: '%', description: 'Prozent · z. B. In-house Share oder Softbonus' },
] as const;

export type AdminMetricUnit = typeof ADMIN_METRIC_UNITS[number]['value'];

export function adminMetricUnitOptions(current: string) {
  const known = ADMIN_METRIC_UNITS.some(unit => unit.value === current);
  // Never silently replace a historical free-text unit when loading a version.
  // Keep it visible, but only offer canonical units for a new selection.
  return [
    ...(known ? [] : [{ value: current, label: current || 'Keine Einheit', description: 'Bisheriger Wert · bitte eine Standard-Einheit wählen', disabled: true }]),
    ...ADMIN_METRIC_UNITS,
  ];
}
