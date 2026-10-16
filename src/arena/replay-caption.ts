/**
 * OWNER: games (real-time)
 * The words a replay and its clip carry, pure: who played (with the AI mark on every seat an agent played), the result, and the
 * line that brings a viewer in. Shared by the replay page (./replay-page.ts), the in-game clip maker (./clip-recorder.ts) and the
 * offline renderer (scripts/clip.ts), so a clip says the same thing wherever it was made. No betting words, ever (the tests check).
 */
import { cartridgeOf } from './cartridges.ts'
import type { ReplayLog, ReplaySeat } from './replay.ts'

export const SITE = 'joinallworld.com'
/** The line under every clip: what Allworld is and that it needs no install. */
export const FOOTER = `Play free in your browser · ${SITE}`

/** A seat's name as a replay shows it: the AI mark on an agent's seat, "Computer" for a house bot. */
export const seatName = (seat: ReplaySeat | undefined): string => (!seat ? 'Player' : seat.bot ? 'Computer' : seat.ai ? `${seat.name} · AI` : seat.name)

/** "Ada vs Bola · AI", or "Ada, Bola, Computer and Computer" for a race. */
export function versus(log: Pick<ReplayLog, 'seats'>): string {
  const names = log.seats.map(seatName)
  if (names.length <= 2) return names.join(' vs ')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** The game's name from the cartridge registry (never from the log's own words). */
export const gameName = (log: Pick<ReplayLog, 'game'>): string => cartridgeOf(log.game)?.name ?? 'Allworld'

export interface ReplayCaption { title: string; players: string; result: string; footer: string; share: string }
export function replayCaption(log: Pick<ReplayLog, 'game' | 'seats' | 'result'>): ReplayCaption {
  const title = gameName(log)
  const players = versus(log)
  const result = log.result.text.trim() || (log.result.draw ? 'A draw' : `${seatName(log.seats[log.result.winners[0] ?? 0])} won`)
  return { title, players, result, footer: FOOTER, share: `${title} on Allworld: ${result}. Watch it, then play free in your browser.` }
}
