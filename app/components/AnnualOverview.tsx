import type { CSSProperties } from 'react';
import { Info, Trophy } from 'lucide-react';
import { ANNUAL_MAXIMUM, annualDots, categoryRailPosition, leaderboardState } from '../lib/annual';
import { TIER_LABELS, type PerformanceTier } from '../lib/groups';
export { CategoryHistoryCard, type CategoryEntry } from './CategoryHistoryCard';

export function AnnualPointsCard({ points, tier, month, onOpenRules, rulesOpen, flow = false, fullWidth = false, currentLevel, incomplete=false, knownMonths=12 }: {
  points: number | null; tier: PerformanceTier; month: string; onOpenRules: () => void;
  rulesOpen?: boolean; flow?: boolean; fullWidth?: boolean; currentLevel?: string | null; incomplete?: boolean; knownMonths?: number;
}) {
  const position = categoryRailPosition(points ?? 0);
  const onThreshold = points !== null && (points <= 20 || points === 21 || points >= 32);
  return <section className={`ui-card points-card tier-${tier}${flow ? ' overview-flow-card' : ''}${fullWidth ? ' is-full-width' : ''}`} aria-label={points !== null ? `${points} von 36 Punkten, letzte 12 Monate${incomplete?', unvollständig':''}` : 'Punkte der letzten 12 Monate noch nicht verfügbar'}>
    <button className="points-rules-trigger" type="button" aria-label="Informationen zu Jahrespunkten und Kategorien öffnen" aria-haspopup="dialog" aria-expanded={rulesOpen} onClick={onOpenRules}><Info size={22} strokeWidth={1.65} /></button>
    {points !== null ? <>
      <div className="constellation">
        <div aria-hidden="true">{annualDots(points).map((dot, index) => <span key={index} className={`constellation-dot${dot.inactive ? ' is-inactive' : ''}${dot.current ? ' is-current' : ''}${dot.previous ? ' is-previous' : ''}${dot.third ? ' is-third' : ''}`} style={{ '--dot-angle': `${dot.angle}deg`, '--dot-size': `${dot.size}px` } as CSSProperties} />)}</div>
        <div className="constellation-copy">
          <div className="points-total"><strong>{points}</strong><span>/ {ANNUAL_MAXIMUM}</span></div>
          <p>{incomplete?'Bekannte Punkte':'Punkte · 12 Monate'}</p><em>{TIER_LABELS[tier]} · {month}</em>{currentLevel&&<small>{`SEC-Level · ${currentLevel}`}</small>}{incomplete&&<small>{knownMonths} von 12 Monaten</small>}
        </div>
      </div>
      <div className="level-rail" aria-label={incomplete?'SEC-Level-Grenzen':`SEC-Level-Fortschritt: ${points} Punkte; SEC bis 20, SEC+ ab 21, SEC Pro ab 32`}>
        <div className="level-line" /><span className={`level-node level-start${!incomplete && onThreshold && points <= 20 ? ' is-achieved' : ''}`} /><span className={`level-node level-plus${!incomplete && points === 21 ? ' is-achieved' : ''}`} /><span className={`level-node level-pro${!incomplete && points >= 32 ? ' is-achieved' : ''}`} />
        {!incomplete && !onThreshold && <span className="level-node level-current" style={{ left: `${position}%` }} />}
        <div className="level-label level-label-start">SEC 20</div><div className="level-label level-label-plus">SEC+ 21</div>
        {!incomplete && !onThreshold && <div className="level-label level-label-current" style={{ left: `${position}%`, top: position <49 || position >88 ? 'calc(50px * var(--sec-ui-scale, 1))' : undefined }}>{points}</div>}
        <div className="level-label level-label-pro">SEC Pro 32</div>
      </div>
    </> : <div className="dashboard-empty"><strong>Noch keine Punkte</strong><p>Für die letzten 12 Monate noch nicht verfügbar.</p></div>}
  </section>;
}

export function LeaderboardCard({ pool, rank, flow = false, outsideTopTen = false, reason, division }: { pool: number; rank: number | null; flow?: boolean; outsideTopTen?: boolean; reason?: string; division?: string }) {
  const state = leaderboardState(pool, rank);
  const outside=state.visible&&(outsideTopTen||state.outside);
  const display=state.ownRank!==null?'ranked':outside?'outside-top-ten':reason==='incomplete-history'?'incomplete-history':'insufficient-data';
  return <section className={`ui-card leaderboard-card leaderboard-own${flow ? ' overview-flow-card' : ''}`} data-ranking-state={display} aria-label={state.ownRank !== null ? `Leaderboard Position ${state.ownRank} von ${pool}` : outside?'Leaderboard: Aktuell nicht in den Top 10':'Leaderboard: Ranking noch nicht verfügbar'}>
    <header><h3>Dein Ranking</h3><p>{division?`${division} · `:''}Letzte 12 Monate</p></header>
    {state.ownRank!==null?<div className="own-rank-result"><strong>{state.ownRank}</strong><span>Dein Platz</span><small>{pool} vergleichbare SEC</small></div>:<div className="own-rank-empty"><Trophy size={28} strokeWidth={1.4} aria-hidden="true"/><strong>{outside?'Aktuell nicht in den Top 10':display==='incomplete-history'?'Deine Historie wächst':'Noch kein Ranking'}</strong><p>{outside?'Mit jedem Monatsabschluss wird neu gereiht.':display==='incomplete-history'?'Für deinen Rang fehlen noch Monatsabschlüsse.':'Ein Vergleich ist ab zehn SEC mit vollständiger Historie möglich.'}</p></div>}
    <p className="own-rank-privacy">Nur dein eigener Top-10-Platz.</p>
  </section>;
}
