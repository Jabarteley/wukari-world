/**
 * OWNER: watch (docs/ALLWORLD-HOUSE.md "Artist premieres")
 * ARTIST PREMIERES, pure. An unsigned artist applies (a name, a few links, one track as a YouTube link: nothing is uploaded) and an admin
 * approves (WOW-PLAN decision 6). Until then the artist's name appears nowhere but in their own application and the admin queue. An
 * approved artist schedules a premiere: one of their own events in Plans (so the time, the going list, reminders and Earn's tickets are
 * the ones the feed already has) and, if they like, one of their worlds, whose shared screen plays the track for everyone inside
 * (docs/WORLDS.md phase 2). The first FRONT_ROW people with a ticket (or, for a free premiere, who said they are going) are the front row.
 *
 * No new money path: a priced premiere is an Earn ticket (docs/EARN.md), bought from the artist through Bachs; a free one is free.
 */
import { youtubeId } from '../spaces/screen.ts'
import { isWorldId } from '../spaces/worlds.ts'

export const PREMIERE = Object.freeze({ name: [2, 40] as const, about: 200, links: 3, linkMax: 200, frontRow: 12, reapplyMs: 7 * 86400000, keepMs: 7 * 86400000, upcoming: 1, list: 30 })
export type ArtistStatus = 'pending' | 'approved' | 'declined'
export interface ArtistApplication { name: string; about: string; links: string[]; track: string }
export interface ArtistRecord extends ArtistApplication { status: ArtistStatus; at: number; decidedAt?: number; reason?: string }
export interface PremiereRecord { id: string; by: string; event: string; world?: string; track: string; at: number; gone?: 1; line?: number }

const CONTROL = /[\u0000-\u001f\u007f<>]/
const plain = (value: unknown): string => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '')

/** An application from the form, or the reason it is refused. Words are screened again by the server's text filter. */
export function cleanApplication(body: unknown): { ok: true; value: ArtistApplication } | { ok: false; reason: string } {
  const r = (body !== null && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const name = plain(r.name), about = plain(r.about)
  if (name.length < PREMIERE.name[0] || name.length > PREMIERE.name[1] || CONTROL.test(name) || /https?:|www\.|@/i.test(name)) return { ok: false, reason: `Your artist name is ${PREMIERE.name[0]} to ${PREMIERE.name[1]} plain characters.` }
  if (about.length > PREMIERE.about || CONTROL.test(about)) return { ok: false, reason: `A few words about you: at most ${PREMIERE.about} characters.` }
  const raw = r.links === undefined ? [] : r.links
  if (!Array.isArray(raw) || raw.length > PREMIERE.links) return { ok: false, reason: `At most ${PREMIERE.links} links.` }
  const links: string[] = []
  for (const item of raw) {
    const link = plain(item)
    if (!link) continue
    let url: URL | null = null
    try { url = new URL(link) } catch { url = null }
    if (!url || url.protocol !== 'https:' || link.length > PREMIERE.linkMax || CONTROL.test(link)) return { ok: false, reason: 'Links start with https:// (your music page, your socials).' }
    if (!links.includes(url.href)) links.push(url.href)
  }
  const track = youtubeId(r.track)
  if (!track) return { ok: false, reason: 'Your track is a YouTube or YouTube Music link. Nothing is uploaded here.' }
  return { ok: true, value: { name, about, links, track } }
}

/** May this person apply (again) now? A pending application can be changed; a declined one after a week; an approved artist is done. */
export function mayApply(record: ArtistRecord | undefined, now: number): { ok: true } | { ok: false; reason: string } {
  if (!record || record.status === 'pending') return { ok: true }
  if (record.status === 'approved') return { ok: false, reason: 'You are approved already. Schedule a premiere.' }
  return now - (record.decidedAt ?? record.at) >= PREMIERE.reapplyMs ? { ok: true } : { ok: false, reason: 'You can apply again a week after the last answer.' }
}

/** The premiere's other fields from the request: the event (one of the artist's own, checked by the server) and an optional world. */
export function cleanPremiere(body: unknown): { ok: true; event: string; world?: string } | { ok: false; reason: string } {
  const r = (body !== null && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const event = typeof r.event === 'string' && /^e[0-9a-z]{1,24}$/.test(r.event) ? r.event : null
  if (!event) return { ok: false, reason: 'Choose one of your events in Plans for the premiere.' }
  if (r.world === undefined || r.world === null || r.world === '') return { ok: true, event }
  return isWorldId(r.world) ? { ok: true, event, world: r.world } : { ok: false, reason: 'Choose one of your worlds, or none.' }
}

export type PremierePhase = 'upcoming' | 'live' | 'over'
export const premierePhase = (event: { start: number; end: number }, now: number): PremierePhase => (now < event.start ? 'upcoming' : now < event.end ? 'live' : 'over')

/**
 * The front row: the first FRONT_ROW people who hold a ticket (a priced premiere, in the order they bought), or who said they are going (a
 * free one, in the order they said it), never the artist. `tickets` is Earn's list for the event; `going` the feed's.
 */
export function frontRow(artist: string, going: readonly string[], tickets: readonly string[] | null): string[] {
  const from = tickets ?? going
  const out: string[] = []
  for (const id of from) { if (id !== artist && !out.includes(id)) out.push(id); if (out.length >= PREMIERE.frontRow) break }
  return out
}

/** The public gist line when a premiere is scheduled ("Ada Sings premieres "Lagos Love" on Saturday at 20:00"). */
export function premiereGist(artist: string, title: string, when: string): string {
  return `New music: ${artist} premieres "${title}" ${when}. Come and listen together.`.slice(0, 120)
}
/** The words of the clip a fan shares from the premiere. */
export function clipWords(artist: string, title: string, front: boolean): string {
  return front ? `Front row at ${artist}'s premiere of "${title}" on Allworld 🎶` : `At ${artist}'s premiere of "${title}" on Allworld 🎶`
}
