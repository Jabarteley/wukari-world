/**
 * OWNER: games
 * CITY LEAGUES, the pure rules: every counted result rolls up to the player's city (the home-city pin counts for people abroad) and
 * country. A city's weekly score in a game is the sum of its best LEAGUE.best players' weekly points, so a big city wins on strength,
 * not on head-count. The standing is words and numbers only.
 */
export const LEAGUE = Object.freeze({ best: 20, boardRows: 50, minCities: 2, minPlayers: 3, standingRows: 8 });
/** The city a result is rolled up to: the pin when the player has one, else the city they live in, else Lagos. */
export const rollupCity = (pin: string | null | undefined, lives: string | null | undefined): string => pin || lives || 'lagos';
/** Sum of the best `LEAGUE.best` scores of a board (rows are [id, name, score, ...]). */
export const cityScore = (scores: readonly number[]): number => [...scores].map((s) => Math.max(0, s)).sort((a, b) => b - a).slice(0, LEAGUE.best).reduce((a, b) => a + b, 0);
export interface Standing { id: string; score: number; players: number }
/** Cities by score, highest first; ties by more players, then id. */
export const rankCities = (rows: readonly Standing[]): Standing[] => [...rows].sort((a, b) => b.score - a.score || b.players - a.players || a.id.localeCompare(b.id));
/** The winner of a week in a game, or null when it was not a contest (fewer than two cities with enough players, or a tie at the top). */
export function weekWinner(rows: readonly Standing[]): Standing | null {
  const real = rankCities(rows.filter((r) => r.players >= LEAGUE.minPlayers && r.score > 0));
  if (real.length < LEAGUE.minCities) return null;
  return real[0] && real[1] && real[0].score === real[1].score ? null : real[0] ?? null;
}
/** The gist line: "Lagos took the week in football." (game null: overall). No money, no names of people. */
export const gistLine = (city: string, game: string | null): string => `${city} took the week${game ? ` in ${game}` : ' in all the games'}.`;
