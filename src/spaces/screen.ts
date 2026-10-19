/**
 * OWNER: spaces
 * A SCREEN IN A SPACE (docs/WORLDS.md, phase 2): the host puts on a YouTube video or song and everyone in the space watches or listens
 * in time. Only the video's id travels (11 letters); the player is youtube-nocookie.com's own embed, allowed in the page's frame-src.
 * The host's device says what is on, whether it plays and where it is; the others follow (server/ws/spaces.ts relays it).
 */

const ID = /^[A-Za-z0-9_-]{11}$/

/** The video id in a YouTube or YouTube Music link (watch, youtu.be, shorts, live, embed), or a bare id; null for anything else. */
export function youtubeId(text: unknown): string | null {
  const raw = typeof text === 'string' ? text.trim() : ''
  if (ID.test(raw)) return raw
  let url: URL
  try { url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`) } catch { return null }
  const host = url.hostname.replace(/^(www|m|music)\./, '')
  let id: string | null = null
  if (host === 'youtu.be') id = url.pathname.split('/')[1] ?? null
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') id = url.searchParams.get('v')
    else { const parts = url.pathname.split('/'); if (['shorts', 'live', 'embed'].includes(parts[1] ?? '')) id = parts[2] ?? null }
  }
  return id && ID.test(id) ? id : null
}

export interface ScreenState { v: string; play: boolean; pos: number; at: number }

/** Where the video is now, in seconds, from what the host last said. */
export const screenPosition = (state: ScreenState, now: number): number => Math.max(0, state.pos + (state.play ? (now - state.at) / 1000 : 0))

/** A screen state from a frame, or null when it cannot be read. */
export function cleanScreen(value: unknown): { v: string; play: boolean; pos: number } | null {
  if (!value || typeof value !== 'object') return null
  const r = value as Record<string, unknown>
  const v = typeof r['v'] === 'string' && ID.test(r['v']) ? r['v'] : null
  const pos = typeof r['pos'] === 'number' && Number.isFinite(r['pos']) && r['pos'] >= 0 && r['pos'] <= 86_400 ? Math.round(r['pos'] * 10) / 10 : null
  if (v === null || pos === null || typeof r['play'] !== 'boolean') return null
  return { v, play: r['play'], pos }
}

/** The embed address for a state, starting at a whole second. */
export const embedUrl = (v: string, start: number, origin: string): string =>
  `https://www.youtube-nocookie.com/embed/${v}?enablejsapi=1&autoplay=1&playsinline=1&rel=0&start=${Math.floor(start)}&origin=${encodeURIComponent(origin)}`
