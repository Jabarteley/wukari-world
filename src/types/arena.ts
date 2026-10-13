/**
 * OWNER: games (real-time)
 * The socket frames of the real-time game rooms (server/ws/arena.ts, server/growth/arena.ts). All types are prefixed `arena-`.
 * A room is private: its code (6 characters) is the invitation. No city, no venue, no life needed — any signed-in socket.
 *
 * CLIENT → SERVER
 *   arena-create  { game, practice?, options?, look? }  make a room and sit in it. `practice`: start at once against the computer.
 *   arena-join    { room, look? }                       take the free seat, or watch when none is free. Idempotent: it is also how a dropped socket comes back to its seat.
 *   arena-watch   { room }                              watch, never sit
 *   arena-start   { room, bots? }                       the host starts a lobby with the computer filling the empty seats (`bots`: 1)
 *   arena-options { room, options }                     the host sets the rules, in a lobby
 *   arena-input   { room, i }                           what the seat is doing now; sent when it CHANGES (game-defined, see its rules)
 *   arena-again   { room }                              after a game: ask for a rematch (it starts when every person seated asked)
 *   arena-leave   { room }                              leave (during a game: forfeit)
 * SERVER → CLIENT
 *   arena-state   roster / status changes, and the latest snapshot
 *   arena-snap    { room, k, s } one per server tick while a game is on: the game's own compact snapshot (identical for everyone)
 */
import type { TableOptionValue } from './growth.ts'

/** [skin, hair colour, outfit colour, bottoms colour] ids from the player's look; cosmetic, untrusted, looked up on the client. */
export type ArenaLook = [string, string, string, string]

/** `seats` (practice): how many seats in all, people and computer players; default the rules' minimum, at most their maximum. */
export interface ArenaCreateFrame { type: 'arena-create'; game: string; practice?: boolean; seats?: number; options?: Record<string, TableOptionValue>; look?: ArenaLook }
export interface ArenaJoinFrame { type: 'arena-join'; room: string; look?: ArenaLook }
export interface ArenaWatchFrame { type: 'arena-watch'; room: string }
/** `bots` > 0 fills empty seats with the computer, up to `seats` in all (default the rules' minimum). */
export interface ArenaStartFrame { type: 'arena-start'; room: string; bots?: number; seats?: number }
export interface ArenaOptionsFrame { type: 'arena-options'; room: string; options: Record<string, TableOptionValue> }
/** `n` is the client's input counter (rises by one per frame): the server echoes the newest one a tick used, in `a` of the snapshots, so a client can predict its own seat. */
export interface ArenaInputFrame { type: 'arena-input'; room: string; i: unknown; n?: number }
export interface ArenaAgainFrame { type: 'arena-again'; room: string }
export interface ArenaLeaveFrame { type: 'arena-leave'; room: string }
export type ArenaClientFrame = ArenaCreateFrame | ArenaJoinFrame | ArenaWatchFrame | ArenaStartFrame | ArenaOptionsFrame | ArenaInputFrame | ArenaAgainFrame | ArenaLeaveFrame

export type ArenaStatus = 'lobby' | 'playing' | 'over' | 'closed'
export interface ArenaSeat { name: string; bot: boolean; id?: string; away?: true; look?: ArenaLook }
/** `places`: per seat, 1 = first; present only when the game ranks every seat (a race). */
export interface ArenaResult { text: string; winners: number[]; draw: boolean; reason: string; scores: number[]; places?: number[] }
export interface ArenaStateFrame {
  type: 'arena-state'
  room: string
  game: string
  label: string
  status: ArenaStatus
  /** Server ticks per second while playing. */
  hz: number
  /** The caller's seat, or null for a watcher. */
  you: number | null
  /** The caller made the room (chooses the rules, starts it). */
  host: boolean
  seats: ArenaSeat[]
  max: number
  min: number
  watchers: number
  options: Record<string, TableOptionValue>
  optionList: { name: string; label: string; values: TableOptionValue[]; names: string[]; value: TableOptionValue }[]
  /** Per seat: has asked for a rematch. */
  again: boolean[]
  /** A practice room (the computer fills the other seat; nobody else is invited). */
  practice: boolean
  result: ArenaResult | null
  /** The latest snapshot, so a late joiner draws at once. */
  snap: unknown
  /** Match number in this room (1, 2, … for rematches). */
  match: number
}
/** `k` is the server tick (rises by one per tick; a tick that changed nothing is not sent). */
export interface ArenaSnapFrame { type: 'arena-snap'; room: string; k: number; s: unknown; /** per seat: the newest input counter the tick consumed; absent until anyone sent a counter. */ a?: number[] }
export type ArenaServerFrame = ArenaStateFrame | ArenaSnapFrame

/** Codes of a refused `arena-*` frame (server/growth/arena.ts refuse()), always with a `reason`. */
export type ArenaErrorCode =
  | 'arena_unknown' | 'arena_game' | 'arena_busy' | 'arena_rate' | 'arena_full' | 'arena_not_host' | 'arena_not_seated'
  | 'arena_need_players' | 'arena_started' | 'arena_closed' | 'invalid_arena'
