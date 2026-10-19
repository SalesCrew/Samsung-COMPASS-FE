import type { CSSProperties } from 'react';
import { Info } from 'lucide-react';
import { ANNUAL_MAXIMUM, annualDots, categoryRailPosition, leaderboardState } from '../lib/annual';
import { TIER_LABELS, type PerformanceTier } from '../lib/groups';
export { CategoryHistoryCard, type CategoryEntry } from './CategoryHistoryCard';

export function AnnualPointsCard({ points, tier, month, onOpenRules, rulesOpen, flow = false, fullWidth = false, currentLevel, incomplete=false }: {
  points: number | null; tier: PerformanceTier; month: string; onOpenRules: () => void;
  rulesOpen?: boolean; flow?: boolean; fullWidth?: boolean; currentLevel?: string | null; incomplete?: boolean;
}) {
  const position = categoryRailPosition(points ?? 0);
  const onThreshold = points !== null && (points <= 20 || points === 21 || points >= 32);
  return <section className={`ui-card points-card tier-${tier}${flow ? ' overview-flow-card' : ''}${fullWidth ? ' is-full-width' : ''}`} aria-label={points !== null ? `${points} von 36 Jahrespunkten, ${tier}` : 'Kein Jahresstand verfügbar'}>
    <button className="points-rules-trigger" type="button" aria-label="Informationen zu Jahrespunkten und Kategorien öffnen" aria-haspopup="dialog" aria-expanded={rulesOpen} onClick={onOpenRules}><Info size={22} strokeWidth={1.65} /></button>
    {points !== null ? <>
      <div className="constellation">
        <div aria-hidden="true">{annualDots(points).map((dot, index) => <span key={index} className={`constellation-dot${dot.inactive ? ' is-inactive' : ''}${dot.current ? ' is-current' : ''}${dot.previous ? ' is-previous' : ''}${dot.third ? ' is-third' : ''}`} style={{ '--dot-angle': `${dot.angle}deg`, '--dot-size': `${dot.size}px` } as CSSProperties} />)}</div>
        <div className="constellation-copy">
          <div className="points-total"><strong>{points}</strong><span>/ {ANNUAL_MAXIMUM}</span></div>
          <p>{incomplete?'Bekannte Punkte':'Jahrespunkte'}</p><em>{TIER_LABELS[tier]} · {month}</em><small>{currentLevel ? `SEC-Level · ${currentLevel}` : incomplete?'Jahresstand unvollständig':`${Math.max(0, ANNUAL_MAXIMUM - points)} fehlen`}</small>
        </div>
      </div>
      <div className="level-rail" aria-label={incomplete?'SEC-Level-Grenzen; Jahresstand unvollständig':`SEC-Level-Fortschritt: ${points} Punkte; SEC bis 20, SEC+ ab 21, SEC Pro ab 32`}>
        <div className="level-line" /><span className={`level-node level-start${!incomplete && onThreshold && points <= 20 ? ' is-achieved' : ''}`} /><span className={`level-node level-plus${!incomplete && points === 21 ? ' is-achieved' : ''}`} /><span className={`level-node level-pro${!incomplete && points >= 32 ? ' is-achieved' : ''}`} />
        {!incomplete && !onThreshold && <span className="level-node level-current" style={{ left: `${position}%` }} />}
        <div className="level-label level-label-start">SEC 20</div><div className="level-label level-label-plus">SEC+ 21</div>
        {!incomplete && !onThreshold && <div className="level-label level-label-current" style={{ left: `${position}%`, top: position <49 || position >88 ? 'calc(50px * var(--sec-ui-scale, 1))' : undefined }}>{points}</div>}
        <div className="level-label level-label-pro">SEC Pro 32</div>
      </div>
    </> : <div className="dashboard-empty"><strong>Jahresstand</strong><p>Für diesen Datenstand noch nicht verfügbar.</p></div>}
  </section>;
}

export function LeaderboardCard({ pool, rank, flow = false, outsideTopTen = false }: { pool: number; rank: number | null; flow?: boolean; outsideTopTen?: boolean }) {
  const state = leaderboardState(pool, rank);
  if (!state.visible) return null;
  return <section className={`ui-card leaderboard-card${flow ? ' overview-flow-card' : ''}`} aria-label={state.ownRank !== null ? `Leaderboard Position ${state.ownRank} von ${pool}` : outsideTopTen || state.outside ? 'Leaderboard: Nur Top 10 wird angezeigt.' : 'Rang nicht verfügbar'}>
    {rank !== null || outsideTopTen ? <>
      <div className="leaderboard-head"><div className={`leaderboard-value${state.outside || outsideTopTen ? ' is-top-ten' : ''}`}><strong>{state.ownRank ?? 'Top 10'}</strong><span>/ {pool}</span></div><p>Leaderboard</p></div>
      <ol className="rank-ladder is-top-ten" aria-label="Plätze 1 bis 10">
        {state.places.map(place => <li className={`rank-row${place === state.ownRank ? ' is-you' : ''}`} key={place} data-rank={place}><span>{place}</span>{place === state.ownRank && <b>Du</b>}</li>)}
      </ol>
      <p className="leaderboard-note">Nur Top 10 wird angezeigt.</p>
    </> : <div className="dashboard-empty"><strong>—</strong><p>Kein Rang zu diesem Stand</p></div>}
  </section>;
}
