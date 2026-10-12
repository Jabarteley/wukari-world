// Ambient voice: the short lines the people of a place say to nobody in particular, so that a place murmurs. Pure and deterministic: the same
// city, venue, slot of the clock and crowd give the same speaker and the same line on every device, so two players in one place hear the same
// murmur. Pacing is part of the pick: about one slot in two holds a line, a slot is NINE seconds, and a line the player has heard in this
// session is never picked again. No language model: the lines are written here, in the voice of the city, and put together from the game's own
// calendar, the sky, the hour and (for a regular) its public record (gossip.ts). English only; a line in another language waits for a native reader.
import { makeRng } from '../util.ts'
import type { TimeBand } from '../world-time.ts'
import { gossipFrom } from './gossip.ts'
import type { PublicRecord } from './gossip.ts'

export const BARK_SLOT_MS = 9_000
/** The share of slots that hold a line. */
export const BARK_RATE = 0.5
/** The least time between two lines, wherever the slots fall: a place murmurs, it does not chatter. */
export const BARK_GAP_MS = 7_000
/** The most lines one visit hears. */
export const BARK_VISIT_CAP = 14
/** Nothing is said in the first seconds of a visit. */
export const BARK_SETTLE_MS = 5_000

export type Speaker = 'walker' | 'sitter' | 'stander' | 'talker' | 'caller' | 'regular'

export interface Bark {
  id: string
  text: string
  /** Who can say it. Omitted: anyone. */
  who?: readonly Speaker[]
  /** Scene kinds it fits. Omitted: anywhere. */
  kinds?: readonly string[]
  cities?: readonly string[]
  bands?: readonly TimeBand[]
  /** 'rain' only while it rains, 'dry' only while it does not. */
  sky?: 'rain' | 'dry'
  /** Needs a calendar event today or tomorrow: `{event}` and `{when}` are filled from it. */
  needs?: 'event'
  weight?: number
}

const bark = (id: string, text: string, more: Omit<Bark, 'id' | 'text'> = {}): Bark => ({ id, text, ...more })
const MORNING: TimeBand[] = ['dawn', 'morning'], EVENING: TimeBand[] = ['evening'], NIGHT: TimeBand[] = ['night']

export const BARKS: readonly Bark[] = Object.freeze([
  // the hour
  bark('hour-1', 'Good morning o! You are up early.', { bands: MORNING }),
  bark('hour-2', 'Morning. Have you eaten something?', { bands: MORNING }),
  bark('hour-3', 'Another day, another hustle.', { bands: MORNING }),
  bark('hour-4', 'This afternoon sun is no joke.', { bands: ['afternoon'], sky: 'dry' }),
  bark('hour-5', 'It is lunch time already? Time is running.', { bands: ['afternoon'] }),
  bark('hour-6', 'Good evening. The day is finally cooling.', { bands: EVENING }),
  bark('hour-7', 'Evening already. Where did the day go?', { bands: EVENING }),
  bark('hour-8', 'It is getting late o. Go home and rest.', { bands: NIGHT }),
  bark('hour-9', 'The night is still young, my friend.', { bands: NIGHT }),
  // the sky
  bark('sky-1', 'This rain! My shoes are finished.', { sky: 'rain' }),
  bark('sky-2', 'Rain again. Everybody run!', { sky: 'rain', who: ['walker'] }),
  bark('sky-3', 'Nice breeze today. Not too hot.', { sky: 'dry', kinds: ['park', 'beach', 'lakeside', 'hilltop', 'walk'] }),
  bark('sky-4', 'The rain will not stop this one from coming out.', { sky: 'rain', kinds: ['market', 'buka', 'club', 'viewing'] }),
  // football
  bark('ball-1', 'Did you see the match last night? That referee!', { kinds: ['viewing', 'club', 'buka', 'rooftop', 'market'] }),
  bark('ball-2', 'The Eagles will qualify, mark my words.', { kinds: ['viewing', 'buka', 'club'] }),
  bark('ball-3', 'My team will win the league this year. Just watch.', { kinds: ['viewing', 'park', 'club'], bands: ['afternoon', 'evening', 'night'] }),
  bark('ball-4', 'Kick-off soon. Find a seat quickly.', { kinds: ['viewing'], bands: ['afternoon', 'evening'] }),
  // traffic
  bark('road-1', 'The traffic this morning was too much.', { bands: MORNING, who: ['walker', 'caller', 'sitter'] }),
  bark('road-2', 'I spent two hours in traffic. Two hours!', { who: ['walker', 'caller', 'sitter'] }),
  bark('road-3', 'Third Mainland? Do not even ask me.', { cities: ['lagos'], who: ['walker', 'caller'] }),
  bark('road-4', 'Go-slow everywhere today. Take the short way.', { cities: ['lagos', 'abuja', 'ibadan', 'kano'], who: ['walker', 'regular'] }),
  // prices
  bark('cost-1', 'Prices are rising every single day.', { who: ['sitter', 'stander', 'regular', 'talker'] }),
  bark('cost-2', 'Tomatoes were cheaper last week. Ask anybody.', { kinds: ['market', 'buka'] }),
  bark('cost-3', 'Fuel price again. We just have to manage.', { who: ['sitter', 'stander', 'caller', 'regular'] }),
  bark('cost-4', 'Bring change o. Nobody has change today.', { kinds: ['market', 'hub'] }),
  // the people who sell
  bark('sell-1', 'Fresh pepper! Fresh tomatoes! Come and see!', { kinds: ['market'], who: ['stander', 'regular'], bands: MORNING }),
  bark('sell-2', 'Madam, come and buy. Best price for you.', { kinds: ['market'], who: ['stander', 'regular'] }),
  bark('sell-3', 'Oya, enter! Enter, we are leaving now!', { kinds: ['hub'], who: ['stander', 'regular'] }),
  bark('sell-4', 'Hot food, hot food! Come and eat!', { kinds: ['buka'], who: ['stander', 'regular'] }),
  // on the phone
  bark('call-1', 'Hello? Yes, I am on my way. Almost there.', { who: ['caller'] }),
  bark('call-2', 'Can you hear me? The network is bad here.', { who: ['caller'] }),
  bark('call-3', 'No, I did not forget. I will send it today.', { who: ['caller'] }),
  bark('call-4', 'Yes, yes. I will call you back.', { who: ['caller'] }),
  // sitting and watching
  bark('sit-1', 'Ah, this is a nice place to rest your legs.', { who: ['sitter'] }),
  bark('sit-2', 'I will sit here small and watch the world.', { who: ['sitter'] }),
  bark('sit-3', 'Is this seat taken? No? Good.', { who: ['sitter'] }),
  // the place
  bark('place-1', 'Another round, please!', { kinds: ['club', 'viewing', 'rooftop'], bands: EVENING }),
  bark('place-2', 'The music is good tonight.', { kinds: ['club', 'rooftop'], bands: NIGHT }),
  bark('place-3', 'Everybody, behave. The pastor is watching.', { kinds: ['worship'], who: ['sitter', 'talker'] }),
  bark('place-4', 'Please, queue properly. One at a time.', { kinds: ['hospital', 'office', 'police', 'polling'] }),
  bark('place-5', 'Fresh air at last. This park is good for the soul.', { kinds: ['park'] }),
  bark('place-6', 'The waves today, eh. Come and look.', { kinds: ['beach'], sky: 'dry' }),
  bark('place-7', 'Boarding soon. Check your gate again.', { kinds: ['airport'], who: ['walker', 'caller'] }),
  // what is on
  bark('news-1', 'They say there is {event} {when}. Will you go?', { needs: 'event', weight: 2 }),
  bark('news-2', 'Everybody is talking about {event}, {when}.', { needs: 'event', weight: 2 }),
])

export interface VoiceContext {
  cityId: string
  cityName: string
  venueId: string
  kind: string
  band: TimeBand
  raining: boolean
  /** The next calendar event in the city and how it is said ("today at 6 PM", "going on now"), if any. */
  event?: { title: string; when: string }
  record?: PublicRecord | null
}

export interface Candidate { id: string; role: Speaker; name?: string }
export interface Spoken { id: string; speaker: string; text: string }

export const slotOf = (now: number): number => Math.floor((Number.isFinite(now) ? now : 0) / BARK_SLOT_MS)

/** The lines this speaker could say now, as (id, text) pairs, before the player's session removes the ones already heard. */
export function linesFor(context: VoiceContext, role: Speaker): { id: string; text: string; weight: number }[] {
  const out: { id: string; text: string; weight: number }[] = []
  for (const line of BARKS) {
    if (line.who && !line.who.includes(role)) continue
    if (line.kinds && !line.kinds.includes(context.kind)) continue
    if (line.cities && !line.cities.includes(context.cityId)) continue
    if (line.bands && !line.bands.includes(context.band)) continue
    if (line.sky === 'rain' && !context.raining) continue
    if (line.sky === 'dry' && context.raining) continue
    let text = line.text
    if (line.needs === 'event') {
      if (!context.event) continue
      text = text.replace('{event}', context.event.title).replace('{when}', context.event.when)
    }
    out.push({ id: line.id, text, weight: (line.weight ?? 1) * (line.kinds ? 1.6 : 1) })
  }
  // A regular knows the public record and says it now and then.
  if (role === 'regular') for (const g of gossipFrom(context.record, context.cityName)) out.push({ id: `gossip-${g.id}`, text: g.text, weight: 2.4 })
  return out
}

/**
 * The line due in a slot of this place, or null. The same (city, venue, slot, speakers) always give the same answer. `heard` is the set of
 * line ids the player has already been told in this session: they are never chosen again, which is also what keeps a quiet place from
 * repeating itself.
 */
export function barkAt(context: VoiceContext, slot: number, speakers: readonly Candidate[], heard: ReadonlySet<string>): Spoken | null {
  if (!speakers.length || !Number.isInteger(slot)) return null
  const next = makeRng(`voice|${context.cityId}|${context.venueId}|${slot}`)
  if (next() >= BARK_RATE) return null
  const sorted = [...speakers].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const who = sorted[Math.floor(next() * sorted.length)] as Candidate
  const pool = linesFor(context, who.role).filter((line) => !heard.has(line.id))
  if (!pool.length) return null
  const total = pool.reduce((sum, line) => sum + line.weight, 0)
  let at = next() * total
  for (const line of pool) { at -= line.weight; if (at <= 0) return { id: line.id, speaker: who.id, text: line.text } }
  const last = pool[pool.length - 1] as { id: string; text: string }
  return { id: last.id, speaker: who.id, text: last.text }
}

export interface Voice {
  /** The line due at `now`, or null. A visit to another place starts afresh; lines the player has heard are never repeated. */
  poll(context: VoiceContext, speakers: readonly Candidate[], now: number): Spoken | null
  reset(): void
  /** The ids heard so far in this session. */
  heardCount(): number
}

/** One session's voice: it keeps what has been heard and the visit's count, and nothing else. */
export function createVoice(): Voice {
  const heard = new Set<string>()
  let visit = '', enteredAt = 0, said = 0, lastSlot = Number.NEGATIVE_INFINITY, lastAt = Number.NEGATIVE_INFINITY
  return {
    reset() { visit = ''; said = 0; lastSlot = Number.NEGATIVE_INFINITY; lastAt = Number.NEGATIVE_INFINITY },
    heardCount: () => heard.size,
    poll(context, speakers, now) {
      const key = `${context.cityId}|${context.venueId}`
      if (key !== visit) { visit = key; enteredAt = now; said = 0; lastSlot = Number.NEGATIVE_INFINITY; lastAt = Number.NEGATIVE_INFINITY }
      if (said >= BARK_VISIT_CAP || now - enteredAt < BARK_SETTLE_MS) return null
      const slot = slotOf(now)
      if (slot === lastSlot || now - lastAt < BARK_GAP_MS) return null
      lastSlot = slot
      const line = barkAt(context, slot, speakers, heard)
      if (!line) return null
      heard.add(line.id)
      said += 1
      lastAt = now
      return line
    },
  }
}
