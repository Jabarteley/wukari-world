/**
 * OWNER: games
 * LADDERS, the pure maths (docs/CLANS.md). Built from results the game already produces. Points run in tiers of sub-tiers:
 *   - below the top tier a win is +30 and a loss -12 (a draw is 0);
 *   - in the top tier points move by rating (Elo against the opponent's points);
 *   - each tier has a FLOOR: once reached in a season, you cannot fall below its base;
 *   - a season is 28 days (admin setting); the next one starts with a SOFT RESET: one or two sub-tiers lower, never zero;
 *   - only a player's best 10 matches of a Lagos day count (not volume);
 *   - the weekly cohort is 30 to 50 players grouped by the hour of their first match of the week.
 */
export const TIERS = Object.freeze(['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master'] as const);
export const LADDER = Object.freeze({ win: 30, loss: -12, subTier: 100, subTiers: 3, bestPerDay: 10, k: 24, resetMin: 50, cohortMin: 30, cohortMax: 50, cohortHourSpread: 3, pairPerDay: 3, seasonDays: 28 });
/** Points at which a tier begins; the last is the top tier. */
export const TIER_BASE: readonly number[] = TIERS.map((_, i) => i * LADDER.subTier * LADDER.subTiers);
const TOP = TIERS.length - 1;
export const tierOf = (pts: number): number => Math.min(TOP, Math.max(0, Math.floor(pts / (LADDER.subTier * LADDER.subTiers))));
/** 0-based sub-tier index over the whole ladder (the top tier has no sub-tiers: it counts as one). */
export const subTierIndex = (pts: number): number => { const t = tierOf(pts); return t >= TOP ? TOP * LADDER.subTiers : Math.min(TOP * LADDER.subTiers - 1, Math.floor(pts / LADDER.subTier)); };
/** "Gold II" style name: III is the lowest sub-tier of a tier, I the highest. */
export function rankName(pts: number): string {
  const t = tierOf(pts);
  if (t >= TOP) return TIERS[TOP] ?? '';
  const inTier = Math.floor((pts - (TIER_BASE[t] ?? 0)) / LADDER.subTier);
  return `${TIERS[t]} ${['III', 'II', 'I'][Math.min(2, inTier)]}`;
}
/** The lowest points a player who has reached `best` (their season's highest tier) can have. */
export const floorOf = (bestTier: number): number => TIER_BASE[Math.min(TOP, Math.max(0, bestTier))] ?? 0;

/** The change for one counted match. `score` is 1 win, 0.5 draw, 0 loss; `opp` is the opponent's points (for the top tier). */
export function pointsFor(pts: number, score: number, opp: number): number {
  if (tierOf(pts) < TOP) return score >= 1 ? LADDER.win : score <= 0 ? LADDER.loss : 0;
  const expected = 1 / (1 + 10 ** ((opp - pts) / 400));
  return Math.round(LADDER.k * (score - expected));
}
/** Points after a change, never below the season's floor. */
export const applyPoints = (pts: number, delta: number, bestTier: number): number => Math.max(floorOf(Math.max(bestTier, tierOf(pts))) , pts + delta);

/** The soft reset at a season's start: one sub-tier down in the lower tiers, two from Gold up; never to zero. Returns the points. */
export function softReset(pts: number): number {
  const index = subTierIndex(pts), drop = tierOf(pts) >= 2 ? 2 : 1, to = Math.max(0, index - drop);
  return Math.max(LADDER.resetMin, to >= TOP * LADDER.subTiers ? TIER_BASE[TOP] ?? 0 : to * LADDER.subTier);
}

/** A day's counted matches: keeps the best `bestPerDay` deltas. Returns the new list and the change to the player's points (what the new match added, less what it pushed out), or counted:false. */
export function bestOfDay(day: readonly number[], delta: number): { day: number[]; net: number; counted: boolean } {
  if (day.length < LADDER.bestPerDay) return { day: [...day, delta], net: delta, counted: true };
  let low = 0;
  for (let i = 1; i < day.length; i++) if ((day[i] ?? 0) < (day[low] ?? 0)) low = i;
  const out = day[low] ?? 0;
  if (delta <= out) return { day: [...day], net: 0, counted: false };
  const next = [...day]; next[low] = delta;
  return { day: next, net: delta - out, counted: true };
}

/** The season that holds a Lagos day, given when the first began; seasons are `days` long. */
export function seasonAt(day: number, anchor: number, days: number): { n: number; start: number; end: number } {
  const len = Math.max(1, Math.floor(days)), n = Math.max(0, Math.floor((day - anchor) / len));
  return { n: n + 1, start: anchor + n * len, end: anchor + (n + 1) * len };
}

/** A weekly cohort of 30 to 50. `open` lists this week's cohorts: [key, hourOfWeek, size]. Returns the key to join, or null for a new one. Same hour first; a cohort under the minimum within a few hours is filled before a new one starts. */
export function chooseCohort(open: readonly (readonly [string, number, number])[], hour: number): string | null {
  const room = open.filter(([, , size]) => size < LADDER.cohortMax);
  const same = room.filter(([, h]) => h === hour).sort((a, b) => b[2] - a[2])[0];
  if (same) return same[0];
  const near = room.filter(([, h, size]) => Math.abs(h - hour) <= LADDER.cohortHourSpread && size < LADDER.cohortMin).sort((a, b) => Math.abs(a[1] - hour) - Math.abs(b[1] - hour) || b[2] - a[2])[0];
  return near ? near[0] : null;
}
