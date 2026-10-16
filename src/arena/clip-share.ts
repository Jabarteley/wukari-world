/**
 * OWNER: games (real-time)
 * "Make a clip" / "Share clip" on a game's result card: fetch the finished match's replay, make the ten-second clip on the phone
 * (./clip-recorder.ts), and hand it to the share sheet with the card's words and the replay link. When the phone cannot record or
 * share a file, the words and the replay link are shared instead (the card). Fetched on the first press: none of it is in a game's
 * own chunk, let alone the first download.
 */
import { parseReplay } from './replay.ts'
import { cartridgeOf } from './cartridges.ts'
import { replayPlayer } from './replay-player.ts'
import { canRecordClips, recordClip } from './clip-recorder.ts'
import type { RealtimeRules } from './rules.ts'

/** The rules of each game, fetched one at a time (a game screen already holds its own; this file must not pull in the others). */
const RULES: Record<string, () => Promise<{ default: RealtimeRules<any, any, any> }>> = {
  fight: () => import('./fight.ts'),
  race: () => import('./race.ts'),
  football: () => import('./football.ts'),
}

export interface MadeClip { file: File | null; text: string; link: string }

/** The replay's own address on this site. */
export const replayLink = (id: string, origin: string = globalThis.location?.origin ?? ''): string => `${origin}/replay?replay=${encodeURIComponent(id)}`

/** Make the clip of replay `id`. Resolves with the file (null when this phone cannot record) and the words to share. */
export async function makeClip(id: string, progress: (done: number) => void): Promise<MadeClip | null> {
  const res = await fetch(`/api/arena/replay/${encodeURIComponent(id)}`, { headers: { accept: 'application/json' } })
  if (!res.ok) return null
  const log = parseReplay(((await res.json()) as { log?: unknown }).log)
  const cartridge = log ? cartridgeOf(log.game) : null
  const load = log ? RULES[log.game] : undefined
  if (!log || !cartridge || !load) return null
  const rules = (await load()).default
  const player = replayPlayer(rules, log, cartridge.rev)
  if (!player) return null
  const link = replayLink(id)
  const file = canRecordClips() ? await recordClip(player, log.game, progress) : null
  return { file, text: `${player.caption.share} ${link}`, link }
}

/** Share a made clip: the file with the words when the phone can share files, else the words and link. Says what happened. */
export async function shareClip(made: MadeClip): Promise<'shared' | 'cancelled' | 'copied' | 'failed'> {
  const { loadShareModule } = await import('../app/features/growth/boundary.ts')
  const share = await loadShareModule()
  const outcome = await share.systemShare({ text: made.text, link: made.link, file: made.file, url: null, whatsapp: '', x: '' })
  if (outcome === 'shared' || outcome === 'cancelled') return outcome
  return (await share.copyText(made.text)) ? 'copied' : 'failed'
}

/** A phone that can share files but not this one (canShare said no) still gets the clip: as a download. */
export function saveClip(file: File): void {
  const url = URL.createObjectURL(file)
  const a = Object.assign(document.createElement('a'), { href: url, download: file.name })
  document.body.append(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}
