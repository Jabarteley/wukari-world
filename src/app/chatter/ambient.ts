// The background people of the venue scene and what they say (docs/NPC-ALIVE.md). Fetched after the game is ready with the chatter chunk;
// nothing of it is in the first download. It does three small things and never touches how a figure is drawn:
//   1. tells the scene host WHO is in each place (a city, a venue, a hour and a sky, on a tier the device can afford), so the scene builds them;
//   2. opens a short window of frames at each turn of the quarter hour, so a player who is only reading is not looking at a still picture;
//   3. every few seconds asks the voice (src/game/chatter/voice.ts) whether a place murmurs now, and puts a line over the speaker.
// Nothing here is sent anywhere: the people and their lines are decided from the place and the clock on every device alike.
import { watch } from 'vue'
import { cityRules } from '../../game/cities/registry.ts'
import { regularsFor, venueFor } from '../../game/cities/runtime.ts'
import { social } from '../features/social/useSocial.ts'
import { lagosTime, formatHour } from '../../game/clock.ts'
import { eventsBetween } from '../../game/calendar.ts'
import { weatherAt } from '../../game/systems/health.ts'
import { timeBand } from '../../game/world-time.ts'
import { createVoice } from '../../game/chatter/voice.ts'
import type { Candidate, Speaker, VoiceContext } from '../../game/chatter/voice.ts'
import type { PublicRecord } from '../../game/chatter/gossip.ts'
import type { Ident } from '../../scene/ambient/plan.ts'
import type { Tier } from '../../scene/ambient/density.ts'
import { bodyAllowed } from '../../scene/body/gate.ts'
import { isDeparting } from '../../life.ts'
import { useApp } from '../state/app.ts'
import { say as sayAbove, tagOf } from './bubbles.ts'
import { heard, heardScene, heardStop } from '../../audio/voice/emit.ts'

/** How often the driver looks at the clock. A slot of the voice is nine seconds, so this never misses one. */
export const AMBIENT_POLL_MS = 4_000
/** The quarter hour the places are cast in (scene/ambient/plan.ts QUARTER_MS: kept here so this chunk does not reach into the scene's). */
const QUARTER_MS = 900_000

let started = false

/** What this device can afford: weak phones (two cores or fewer, 2 GB or less, Data Saver, 2G) get a few walkers and no far crowd. */
export const tierNow = (): Tier => (bodyAllowed() ? 'full' : 'light')

const raining = (cityId: string, at: number): boolean => { try { return weatherAt(at, cityId).raining } catch { return false } }

/** The calendar event the city has today or tomorrow, as the voice says it. */
function nextEvent(cityId: string, now: number): { title: string; when: string; where: string } | null {
  try {
    const found = eventsBetween(now, now + 36 * 3_600_000, cityId)[0]
    if (!found) return null
    const day = lagosTime(found.start), today = lagosTime(now), at = formatHour(day.hour + day.minute / 60)
    // An event that has begun is going on now; one that has not is today's or tomorrow's.
    const when = found.live ? 'going on now' : day.day === today.day ? `today at ${at}` : `tomorrow at ${at}`
    return { title: found.title, when, where: found.venueLabel }
  } catch { return null }
}

export function startAmbient(): void {
  if (started) return
  started = true
  const { game, scene } = useApp()
  const voice = createVoice()

  const ident = (cityId: string, venueId: string, kind: string): Ident => ({
    cityId, venueId, kind, tier: tierNow(),
    rainingAt: (at) => raining(cityId, at),
    hourAt: (at) => lagosTime(at).minuteOfDay / 60,
  })
  /** Who is in which place: the host asks for every venue it builds. Nothing at home, on a trip, or in a friend's house. */
  const ambientFor = (venueId: string, kind: string): Ident | null => {
    const state = game.state.value
    if (venueId === 'home' || kind === 'home' || isDeparting(state) || social.me?.visiting) return null
    return ident(game.view.value.cityId, venueId, kind)
  }

  let hosted: unknown = null
  const attach = (): void => {
    const world = scene.venue.value
    if (!world || world === hosted) return
    hosted = world
    world.setAmbient(ambientFor)
  }
  watch(() => scene.venue.value, attach, { immediate: true, flush: 'post' })

  /** The public record a regular may pass on: civic headlines the life was told, the city's calendar, the sky. Nothing else is read. */
  const record = (cityId: string, now: number): PublicRecord => {
    const state = game.state.value
    const news = (state.social?.notices ?? []).filter((notice) => notice.kind === 'gov').slice(-3).map((notice) => notice.text)
    const event = nextEvent(cityId, now)
    const rain: PublicRecord['rain'] = raining(cityId, now) ? undefined : raining(cityId, now + 3_600_000) ? 'soon' : raining(cityId, now + 6 * 3_600_000) ? 'later' : undefined
    return { news, ...(event ? { event } : {}), ...(rain ? { rain } : {}) }
  }

  let lastQuarter = -1, lastKey = ''
  const tick = (): void => {
    if (globalThis.document.hidden) return
    const world = scene.venue.value, state = game.state.value
    if (!world || state.location === 'home' || isDeparting(state) || social.me?.visiting) { voice.reset(); lastKey = ''; heardStop(); return }
    const now = Date.now(), cityId = game.view.value.cityId
    const key = `${cityId}|${state.location}`
    const quarter = Math.floor(now / QUARTER_MS)
    // The quarter turned while the player stayed: a short window, so the new people can be seen coming in.
    if (key === lastKey && quarter !== lastQuarter) world.wakeAmbient()
    lastKey = key; lastQuarter = quarter

    const kind = venueFor(cityId, state.location)?.scene?.kind
    if (!kind) return
    const names = new Map<string, string>()
    try { for (const npc of regularsFor(cityId)) if (npc.venue === state.location) names.set(`npc:${npc.id}`, npc.name) } catch { /* the regulars are not loaded yet */ }
    const speakers: Candidate[] = world.ambientPeople().map((person) => ({ id: person.id, role: (names.has(person.id) ? 'regular' : person.role) as Speaker, ...(names.has(person.id) ? { name: names.get(person.id) as string } : {}) }))
    if (!speakers.length) return
    const country = cityRules(cityId)?.country?.id
    // Who is in the place and what they do: the voices make a laugh, a call, a hum or footsteps of it (src/audio/voice).
    const people = world.ambientPeople()
    heardScene({ kind, ...(country ? { country } : {}), people: people.map((person) => ({ id: person.id, role: person.role, x: person.x, z: person.z, sitting: person.sitting })) })
    const context: VoiceContext = {
      cityId, cityName: cityRules(cityId)?.name ?? '', venueId: state.location, kind, band: timeBand(now), raining: raining(cityId, now),
      ...(nextEvent(cityId, now) ? { event: nextEvent(cityId, now) as { title: string; when: string } } : {}), record: record(cityId, now),
    }
    const line = voice.poll(context, speakers, now)
    if (!line) return
    const name = names.get(line.speaker)
    // A regular's line is a bubble over their name tag (with the NPC word); anyone else's is a bubble over their figure in the scene itself.
    if (name && tagOf(line.speaker.slice(4))) sayAbove(line.speaker.slice(4), name, line.text, false)
    else world.say(line.speaker, line.text)
    const at = people.find((person) => person.id === line.speaker)
    heard({ id: line.speaker, text: line.text, kind: name ? 'regular' : 'npc', place: kind, ...(country ? { country } : {}), ...(at ? { x: at.x, z: at.z } : {}) })
    world.wakeAmbient()
  }

  watch(() => `${game.view.value.cityId}|${game.state.value.location}`, () => { voice.reset(); lastKey = ''; heardStop() })
  globalThis.setInterval(tick, AMBIENT_POLL_MS)
}
