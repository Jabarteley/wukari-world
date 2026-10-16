/**
 * OWNER: games
 * WHAT A FINISHED GAME TELLS THE LADDERS. Table games (server/growth/tables.ts) call `ctx.checks.gameResult(db, result)` inside the
 * transaction that records the result; the real-time arena (server/growth/arena.ts) raises the event 'game-result' with an
 * ArenaFinished, and server/clans/ turns it into a GameResult in its own transaction. A match counts once (the match id), only
 * with two or more people or agents seated (a game against the house's bots never counts), and only through the ladder's own limits.
 */
export interface GameResultSeat { id: string; /** 1 win, 0.5 draw, 0 loss; a place in a bigger game is spread between 1 and 0. */ score: number }
export interface GameResult { match: string; game: string; at: number; seats: GameResultSeat[] }
/** The arena's raw end of game. `seats` are the seated players (bots flagged); `winners` are seat indexes; `places` (1 = first) when the game ranks everyone. */
export interface ArenaFinished { match: string; game: string; at: number; seats: { id: string; bot: boolean }[]; winners: number[]; draw: boolean; places?: number[] }

const GAME = /^[a-z][a-z0-9-]{1,23}$/;
export const validGame = (game: unknown): game is string => typeof game === 'string' && GAME.test(game);
/** Scores of every seat, 0..1. */
export function seatScores(count: number, winners: readonly number[], draw: boolean, places?: readonly number[]): number[] {
  return Array.from({ length: count }, (_, i) => {
    const place = places?.[i];
    if (place !== undefined && count > 1 && !draw) return Math.max(0, Math.min(1, 1 - (place - 1) / (count - 1)));
    return draw ? 0.5 : winners.includes(i) ? 1 : 0;
  });
}
/** An arena end of game as a GameResult, or null when fewer than two people were seated. Bots are dropped; a bot's win leaves people's seats as they were. */
export function fromArena(done: ArenaFinished): GameResult | null {
  const scores = seatScores(done.seats.length, done.winners, done.draw, done.places);
  const seats = done.seats.flatMap((seat, i) => (seat.bot ? [] : [{ id: seat.id, score: scores[i] ?? 0 }]));
  return seats.length >= 2 && validGame(done.game) ? { match: done.match, game: done.game, at: done.at, seats } : null;
}
