/**
 * The share loops of the wow plan, Phase 4 (docs/SHARE-LOOPS.md): the pure parts every picture card shares. The link a card carries,
 * its words, the file name, plain text cleaning and line wrapping. No DOM, no network: drawing is ./loopPaint.ts, sending ./loopShare.ts.
 *
 * A card is made on the device from facts the player can already see, and nothing leaves the device until the person picks a target in
 * the phone's own share sheet (or the Allworld sheet's WhatsApp link). There is no server share record and no `/s/<code>`: the link is the
 * player's profile (or a street, or a city), with the loop's own ad-source words, so a landing is counted under that source.
 */
import { shareUrl } from '../../../game/share-model.ts'

/** The seven loops, as the source word their links carry (`utm_source=<loop>`). */
export type LoopKind = 'street-video' | 'start' | 'wrapped' | 'passport' | 'frontpage' | 'fame' | 'duet'
export const LOOP_KINDS: readonly LoopKind[] = Object.freeze(['street-video', 'start', 'wrapped', 'passport', 'frontpage', 'fame', 'duet'])

export const SITE = 'joinallworld.com'
/** Phone-story shape (WhatsApp Status, Instagram and TikTok stories). */
export const STORY_W = 1080, STORY_H = 1920

/** Text a player can see, one line, without control characters, at most `max` characters (an ellipsis when cut). */
export function plain(value: unknown, max = 80): string {
  const text = String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

/** Game naira as the cards write it: "₦12,400". Never a real-money amount: the card says "game naira" beside it where room allows. */
export const gameNaira = (value: unknown): string => `₦${Math.max(0, Math.round(Number(value) || 0)).toLocaleString('en-NG')}`

/** A public handle as the feed keeps it, or null (the same rule as Capture's mark). */
export function loopHandle(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim().replace(/^@/, '').toLowerCase() : ''
  return /^[a-z][a-z0-9._]{2,19}$/.test(text) ? text : null
}

/** The corner words: "@handle · joinallworld.com", or the site alone. */
export const loopMark = (handle: unknown): string => { const clean = loopHandle(handle); return clean ? `@${clean} · ${SITE}` : SITE }

/**
 * Where a card leads. `path` is a path on the site ('/p/@ada', '/street/lagos/surulere', '/visit/lagos'); anything that is not a plain
 * path becomes the front door. The ad-source words say which loop made it: utm_source=<loop>, utm_medium=card, utm_campaign=<loop>.
 */
export function loopLink(origin: string, loop: LoopKind, path = '/'): string {
  const base = String(origin ?? '').replace(/\/+$/, '') || `https://${SITE}`
  const clean = /^\/[A-Za-z0-9@._/-]{0,120}$/.test(path) && !path.includes('//') ? path : '/'
  return shareUrl(`${base}${clean}`, loop, 'card', loop)
}

/** A player's profile path (/p/@handle or /p/<id>), or '/' without either. */
export function profileOf(handle: unknown, id: unknown): string {
  const clean = loopHandle(handle)
  if (clean) return `/p/@${clean}`
  const text = typeof id === 'string' ? id.trim() : ''
  return /^[A-Za-z0-9_-]{1,64}$/.test(text) ? `/p/${text}` : '/'
}

/** The words that go with a card: its lines, then the link alone on the last line (as every share does). */
export function loopText(lines: readonly string[], link: string): string {
  return [...lines.map((line) => plain(line, 200)).filter(Boolean), link].join('\n')
}

/** The file a card is shared as. */
export const loopFile = (loop: LoopKind, type: 'image/png' | 'video/mp4' | 'video/webm' = 'image/png'): string =>
  `allworld-${loop}.${type === 'image/png' ? 'png' : type === 'video/mp4' ? 'mp4' : 'webm'}`

/**
 * Words broken into lines no wider than `width` (as `measure` says), at most `max` lines; the last one ends in an ellipsis when words
 * were left over. A single word wider than the line is cut with an ellipsis.
 */
export function wrapLines(text: string, width: number, measure: (line: string) => number, max = 3): string[] {
  const words = plain(text, 600).split(' ').filter(Boolean), lines: string[] = []
  let line = ''
  const fit = (word: string): string => {
    if (measure(word) <= width) return word
    let cut = word
    while (cut.length > 1 && measure(`${cut}…`) > width) cut = cut.slice(0, -1)
    return `${cut}…`
  }
  for (let index = 0; index < words.length; index++) {
    const word = words[index]!, next = line ? `${line} ${word}` : word
    if (measure(next) <= width) { line = next; continue }
    if (line) lines.push(line)
    line = fit(word)
    if (lines.length === max) { line = ''; break }
  }
  if (line && lines.length < max) lines.push(line)
  const used = lines.join(' ').split(' ').filter(Boolean).length
  if (lines.length === max && used < words.length) {
    let last = lines[max - 1]!
    while (last.length > 1 && measure(`${last}…`) > width) last = last.slice(0, -1).trimEnd()
    lines[max - 1] = last.endsWith('…') ? last : `${last}…`
  }
  return lines
}

/** A small stable number from words (the same title for the same name every time; no randomness on a card). */
export function seedOf(text: string): number {
  let hash = 2166136261
  for (let index = 0; index < text.length; index++) { hash ^= text.charCodeAt(index); hash = Math.imul(hash, 16777619) }
  return hash >>> 0
}
