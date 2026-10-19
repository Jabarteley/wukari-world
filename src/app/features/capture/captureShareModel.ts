/**
 * Sharing a capture: the pure parts. The corner mark's words, size and place, the 9:16 crop, the video type to record, and the
 * link and text that leave the phone. No DOM, no network: the drawing is captureMark.ts and the sending is captureShare.ts.
 * Nothing here is uploaded; the file stays on the device until the person taps share.
 */
import { shareUrl } from '../../../game/share-model.ts'

export const SITE = 'joinallworld.com'
/** The length of "Clip this moment". */
export const MOMENT_MS = 6_000
/** The phone-story shape. */
export const STORY_RATIO = 9 / 16
/** The longest edge of a marked clip: a re-encode runs in real time, so a smaller frame keeps a weak phone cool. */
export const CLIP_MAX_EDGE = 1280
/** The longest edge of a marked photo. */
export const PHOTO_MAX_EDGE = 2160

/** A public handle as the feed keeps it (src/feed/model.ts cleanHandle): lower-case letters, digits, dots, underscores, a letter first. Null for anything else. */
export function markHandle(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim().replace(/^@/, '').toLowerCase() : ''
  return /^[a-z][a-z0-9._]{2,19}$/.test(text) ? text : null
}

/** The words in the corner: "@handle · joinallworld.com", or the site alone without a handle. */
export function markText(handle: unknown): string {
  const clean = markHandle(handle)
  return clean ? `@${clean} · ${SITE}` : SITE
}

export interface Rect { x: number; y: number; w: number; h: number }
export interface Frame { sx: number; sy: number; sw: number; sh: number; w: number; h: number }

const even = (n: number): number => Math.max(2, Math.floor(n / 2) * 2)

/**
 * Which part of a picture of `srcW` x `srcH` is drawn and how big the result is. With `story` the middle 9:16 is kept (a wide scene loses
 * its sides, a tall one its top and bottom); the output never has an edge longer than `maxEdge` and both sides are even, as video encoders want.
 */
export function frameFor(srcW: number, srcH: number, story: boolean, maxEdge: number): Frame {
  const width = Math.max(2, Math.floor(srcW)), height = Math.max(2, Math.floor(srcH))
  let sx = 0, sy = 0, sw = width, sh = height
  if (story) {
    if (width / height > STORY_RATIO) { sw = Math.floor(height * STORY_RATIO); sx = Math.floor((width - sw) / 2) }
    else { sh = Math.floor(width / STORY_RATIO); sy = Math.floor((height - sh) / 2) }
  }
  sw = Math.min(width - sx, Math.max(2, sw)); sh = Math.min(height - sy, Math.max(2, sh))
  const scale = Math.min(1, maxEdge / Math.max(sw, sh))
  return { sx, sy, sw, sh, w: even(sw * scale), h: even(sh * scale) }
}

export interface MarkLayout { fontSize: number; pad: number; radius: number; box: Rect; textX: number; textY: number }

/**
 * The corner mark's size and place on a frame of `width` x `height`. `measure(fontSize)` is the width of the text at that size.
 * The mark sits in the lower right; in a 9:16 story it is lifted clear of the bottom strip the story apps cover with their own buttons.
 * It is about 3.4% of the short side, never wider than 78% of the frame and always inside it.
 */
export function markLayout(width: number, height: number, measure: (fontSize: number) => number, story = false): MarkLayout {
  const short = Math.min(width, height)
  let fontSize = Math.min(56, Math.max(12, Math.round(short * 0.034)))
  let pad = Math.round(fontSize * 0.6)
  let textW = measure(fontSize)
  const room = width * 0.78
  for (let tries = 0; tries < 8 && textW + pad * 2 > room && fontSize > 8; tries++) {
    fontSize = Math.max(8, Math.floor(fontSize * 0.88)); pad = Math.round(fontSize * 0.6); textW = measure(fontSize)
  }
  const margin = Math.max(8, Math.round(short * 0.03))
  const lift = story ? Math.round(height * 0.14) : 0
  const w = Math.min(width - margin * 2, Math.ceil(textW + pad * 2)), h = Math.ceil(fontSize + pad * 1.2)
  const x = Math.max(0, width - margin - w)
  const y = Math.max(0, height - margin - lift - h)
  return { fontSize, pad, radius: Math.round(h / 2), box: { x, y, w, h }, textX: x + Math.round((w - textW) / 2), textY: y + Math.round(h / 2 + fontSize * 0.34) }
}

export interface VideoChoice {
  /** What MediaRecorder is asked for (may name codecs). */
  mimeType: string
  /** What the file is called: no codecs, as share targets expect. */
  type: 'video/mp4' | 'video/webm'
  ext: 'mp4' | 'webm'
}

/** MP4 where the browser can record it (recent Chrome and Safari), WebM otherwise. Null when MediaRecorder can record neither. */
export function pickVideoType(isSupported: (type: string) => boolean): VideoChoice | null {
  const mp4 = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4']
  const webm = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  for (const mimeType of mp4) if (isSupported(mimeType)) return { mimeType, type: 'video/mp4', ext: 'mp4' }
  for (const mimeType of webm) if (isSupported(mimeType)) return { mimeType, type: 'video/webm', ext: 'webm' }
  return null
}

/** A recorder's own type ("video/webm;codecs=vp9", "video/mp4; codecs=avc1") reduced to the file type, or the given default. */
export function baseVideoType(type: unknown, fallback: 'video/mp4' | 'video/webm' = 'video/webm'): 'video/mp4' | 'video/webm' {
  const text = typeof type === 'string' ? type.toLowerCase() : ''
  return text.startsWith('video/mp4') ? 'video/mp4' : text.startsWith('video/webm') ? 'video/webm' : fallback
}
export const videoExtension = (type: unknown): 'mp4' | 'webm' => (baseVideoType(type) === 'video/mp4' ? 'mp4' : 'webm')
export const videoLabel = (type: unknown): string => (baseVideoType(type) === 'video/mp4' ? 'MP4' : 'WebM')

/** The file name a shared capture carries. */
export const shareFileName = (kind: 'photo' | 'video', type: unknown): string => (kind === 'photo' ? 'allworld-scene.jpg' : `allworld-scene.${videoExtension(type)}`)

/** The path of a player's profile: /p/@handle, or /p/<public id>, or '' when neither is known. */
export function profilePath(handle: unknown, id: unknown): string {
  const clean = markHandle(handle)
  if (clean) return `/p/@${clean}`
  const text = typeof id === 'string' ? id.trim() : ''
  return /^[A-Za-z0-9_-]{1,64}$/.test(text) ? `/p/${text}` : ''
}

/**
 * The link a shared clip or photo carries: the player's profile with the clip's ad-source words
 * (utm_source=clip, utm_medium=share, utm_campaign=clip), so the landing is counted under source "clip".
 * Without a profile it is the site's front door with the same words.
 */
export function clipLink(origin: string, handle: unknown, id: unknown): string {
  const base = String(origin ?? '').replace(/\/+$/, '')
  return shareUrl(`${base}${profilePath(handle, id) || '/'}`, 'clip', 'share', 'clip')
}

/** The words that go with a shared capture; the link is the last line on its own, as with every share. */
export function clipText(handle: unknown, link: string, kind: 'photo' | 'video'): string {
  const clean = markHandle(handle)
  const first = kind === 'video' ? 'A moment from my world in Allworld.' : 'A look at my world in Allworld.'
  return [first, clean ? `Find me: @${clean}` : 'Come and see it.', link].join('\n')
}

/** The two things a person can be told when a clip cannot be marked on this browser. */
export const UNMARKED_CLIP_NOTE = 'This browser cannot add the corner mark to a video. Share the photo with the mark, or the clip without it.'

export interface MomentInput {
  /** The owambe party at the player's home, when one is on (social.me.house.party). */
  party: { title: string; until: number } | null
  /** What is on now or soon, as the growth hello lists it (CalendarOccurrence). */
  events: readonly { key: string; title: string; live: boolean; end: number }[]
  /** Server time, ms. */
  now: number
}
export interface Moment { key: string; label: string }

/** What "Clip this moment" can be offered for: a party at home, else the first event that is live. Null when nothing is on. */
export function liveMoment(input: MomentInput): Moment | null {
  const { party, events, now } = input
  if (party && party.until > now) return { key: `party:${party.until}`, label: party.title || 'the party' }
  const event = events.find((one) => one.live && one.end > now)
  return event ? { key: `event:${event.key}:${event.end}`, label: event.title } : null
}
