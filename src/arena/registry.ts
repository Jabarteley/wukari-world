/**
 * OWNER: games (real-time)
 * The registry of real-time games: one rules object per game (the contract is in ./rules.ts).
 * Only the server imports this file, so a game's rules never reach the browser unless its screen needs them.
 * ADDING A GAME: write src/arena/<id>.ts (default export a RealtimeRules), import it here, add it to ARENA_GAMES.
 */
import type { RealtimeRules } from './rules.ts'
import fight from './fight.ts'

// The rules are stored behind the contract's loosest types; the room host never looks inside a state or an input.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ARENA_GAMES: Readonly<Record<string, RealtimeRules<any, any, any>>> = Object.freeze({ fight })
export const arenaGame = (id: unknown): RealtimeRules<any, any, any> | null => (typeof id === 'string' && Object.hasOwn(ARENA_GAMES, id) ? ARENA_GAMES[id] ?? null : null)
