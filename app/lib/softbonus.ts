/** Presentation-only percentage markers, not annual points or medal thresholds. */
export function softbonusDots(value: number | null) {
  const progress = value === null || !Number.isFinite(value) ? 0 : Math.max(0, Math.min(100, value)) / 2;
  const current = Math.ceil(progress) - 1;
  return Array.from({ length: 50 }, (_, index) => ({
    angle: index * 7.2,
    fill: Math.max(0, Math.min(1, progress - index)),
    size: 12.2 * (index === current ? 1.3 : index === current - 1 ? 1.07 : index === current - 2 ? 1.03 : 1),
    current: progress > 0 && index === current,
  }));
}

export function softbonusGap(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Noch kein Iststand';
  const gap = Math.max(0, 100 - value);
  return gap > 0 ? `${gap.toLocaleString('de-AT', { maximumFractionDigits: 1 })}% bis Ziel` : 'Ziel erreicht';
}
