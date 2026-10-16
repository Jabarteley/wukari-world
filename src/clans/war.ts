/**
 * OWNER: games
 * CLAN WARS, the pure rules: a week of clan against clan on the top 80% of the members' points (so nobody is dropped for running out of
 * data), matched by size and rating. Prizes are game money, paid by server/clans/ within the wallet's own limits.
 */
export const WAR = Object.freeze({ share: 0.8, startRating: 1000, k: 24, prizeWin: 3000, prizeDraw: 1000, sizeRatio: 0.6, poolMax: 300 });
/** How many of `n` members count: 80%, rounded down, at least one. */
export const counted = (n: number): number => Math.max(1, Math.floor(n * WAR.share));
/** A clan's war score: every member's points (0 for a quiet one, never below 0), the best 80% added up. */
export function warScore(points: readonly number[]): { score: number; used: number } {
  if (!points.length) return { score: 0, used: 0 };
  const sorted = points.map((p) => Math.max(0, Math.round(p))).sort((a, b) => b - a), used = counted(sorted.length);
  return { score: sorted.slice(0, used).reduce((a, b) => a + b, 0), used };
}
export type Entry = readonly [id: string, size: number, rating: number];
/** The best opponent in the waiting pool for a clan of this size and rating, or null. Sizes must be within WAR.sizeRatio of each other. */
export function matchClan(pool: readonly Entry[], me: Entry): Entry | null {
  let best: Entry | null = null, bestCost = Infinity;
  for (const other of pool) {
    if (other[0] === me[0]) continue;
    const small = Math.min(other[1], me[1]), big = Math.max(other[1], me[1]);
    if (small / big < WAR.sizeRatio) continue;
    const cost = (big - small) * 20 + Math.abs(other[2] - me[2]);
    if (cost < bestCost) { best = other; bestCost = cost; }
  }
  return best;
}
export type Outcome = 'win' | 'loss' | 'draw';
export const outcomeOf = (mine: number, theirs: number): Outcome => (mine > theirs ? 'win' : mine < theirs ? 'loss' : 'draw');
/** New clan ratings after a war: [mine, theirs]. */
export function ratings(mine: number, theirs: number, outcome: Outcome): [number, number] {
  const e = 1 / (1 + 10 ** ((theirs - mine) / 400)), s = outcome === 'win' ? 1 : outcome === 'draw' ? 0.5 : 0, d = Math.round(WAR.k * (s - e));
  return [Math.max(100, mine + d), Math.max(100, theirs - d)];
}
export const prizeFor = (outcome: Outcome): number => (outcome === 'win' ? WAR.prizeWin : outcome === 'draw' ? WAR.prizeDraw : 0);
