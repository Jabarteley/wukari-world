// RIDE PACKS (docs/CITY-TEXTURE.md): the conductor's patter, the driver's remarks and the radio that a trip in a city plays instead of a bare progress bar.
// Every line is written by hand: no model, no network. A pack is one city's lines by way of travelling (the Lagos danfo, the Accra tro-tro, the Nairobi
// matatu, the Johannesburg minibus taxi all ride the game's 'danfo' mode); a city without a pack, or a mode a pack leaves out, falls back to the generic pack.
// The radio is words about a song ("something with a bass line"), never its lyrics. Warm and funny, never a warning about the city.
// Pure and seeded: the same trip gets the same lines on every device. Only the Map's trip bar imports this, behind a dynamic import (RideBanter.vue).
import { makeRng } from '../../../game/util.ts'

export type Part = 'morning' | 'midday' | 'evening' | 'night'
export type Who = 'conductor' | 'driver' | 'radio' | 'rider'
/** `when` limits a line to parts of the day; `near` to a trip whose from/to names contain one of the words (lower case). */
export interface RideLine { who: Who; text: string; when?: readonly Part[]; near?: readonly string[] }
export interface RidePack { id: string; /** City ids it serves. */ cities: readonly string[]; /** Hours ahead of UTC, for the part of the day. */ utc: number; modes: Readonly<Record<string, readonly RideLine[]>> }

const c = (text: string, extra: Partial<RideLine> = {}): RideLine => ({ who: 'conductor', text, ...extra })
const d = (text: string, extra: Partial<RideLine> = {}): RideLine => ({ who: 'driver', text, ...extra })
const r = (text: string, extra: Partial<RideLine> = {}): RideLine => ({ who: 'radio', text, ...extra })
const p = (text: string, extra: Partial<RideLine> = {}): RideLine => ({ who: 'rider', text, ...extra })
const AM = ['morning'] as const, MID = ['midday'] as const, PM = ['evening'] as const, NIGHT = ['night'] as const

export const GENERIC: RidePack = { id: 'generic', cities: [], utc: 0, modes: {
  danfo: [
    c('Move in small, there is space at the back!'), c('Change ready, please. The driver does not do miracles.'), d('We are moving. Hold your bag and your peace.'),
    r('The radio hums a song everyone half knows. Three people nod.'), p('Someone is already asleep with their mouth open. Respect.'), c('Next stop, anyone? Shout early, not at the last second.', { when: AM }),
    r('The evening show is on: callers, jokes and one very long dedication.', { when: PM }), d('Rain or shine, we reach. Mostly.', { when: MID }),
  ],
  keke: [d('Small road, small keke, big dream.'), d('Hold on at the bump, there is always a bump.'), r('A tiny speaker plays a happy beat.')],
  okada: [d('Hold me small, not like that.'), d('Helmet on, shoulders down. We are flying low.'), p('The wind tidies your hair for free.')],
  cab: [d('Air-con is on. Sit back.'), r('The radio is soft. The seat is softer.'), p('You check your phone. Nothing urgent. Lovely.')],
  car: [r('Your own radio, your own song. No one to argue with.')],
  boat: [d('Mind the water. It is only water.'), p('The breeze is free. Take plenty.')],
  trek: [p('Left, right, left. Your shoes are doing the work.'), p('A stranger nods. You nod back. The street is friendly today.')],
} }

export const LAGOS: RidePack = { id: 'lagos', cities: ['lagos'], utc: 1, modes: {
  danfo: [
    c('Oshodi! Oshodi! Enter with your change!', { near: ['oshodi', 'ikeja'] }), c('Yaba, Yaba, Yaba! One person, one seat. Two persons, one story.', { near: ['yaba', 'surulere', 'unilag'] }),
    c('Ikeja! Ikeja! Anybody for Ikeja, enter!', { near: ['ikeja'] }), c('Obalende! Obalende! Last two seats, last two!', { near: ['island', 'obalende', 'marina'] }),
    c('Oya, oya, we dey go! Hold your bag, hold your faith.'), c('Aunty, your change is coming. Patience is also a currency.'), c('Driver, small small. We are not racing a plane.'),
    c('Who is going to the next stop? Talk now or hold your peace till the one after.'), c('No standing at the door, madam. The door is not a seat.'),
    c('Conductor business: one hundred naira, no be one hundred and one.'), c('Everybody inside, the bus is not an elevator but we can try.'),
    c('E go better. This traffic na only for now.', { when: PM }), c('Morning, family! Early bird gets the front seat.', { when: AM }),
    d('Go-slow ahead. We shall enjoy the view together.', { when: PM }), d('This road knows me. I know this road. We are friends.'),
    r('Radio: "Traffic report. Third Mainland is moving, Ikorodu Road is thinking about it, and Oshodi is being Oshodi."'), r('Radio: "Good morning Lagos! The weather is sunny, the chai is hot and the day is ours."', { when: AM }),
    r('Radio: a gospel choir fills the bus. Half the bus joins in. The other half hums to be safe.', { when: AM }), r('Radio: an Afrobeats bass line rolls in. Shoulders start moving on their own.', { when: PM }),
    r('Radio: late-night show, a caller dedicates a song to her mother. The bus goes quiet and smiles.', { when: NIGHT }), r('Radio: the afternoon presenter reads a proverb and nobody argues.', { when: MID }),
    p('Someone behind you is on the phone: "I am coming, I am on the road, I am almost there." Nobody is almost there.'), p('A trader climbs on, sells sweets, waves, and climbs off like a magician.', { when: MID }),
    p('Window seat. The whole city goes past like a film with bad subtitles.'), p('The stranger beside you shares a groundnut. The ride just got better.'),
  ],
  okada: [
    d('Oga, hold me small! The road is bumpy, not the ride.'), d('Helmet on, shoulders down. We dey fly low.'), d('Small gap, I know the gap. Trust the gap.'), d('Which side you wan stop? Show me with your hand, not your eyes.'),
    d('We go cut through the back road. Shorter by ten minutes and one good story.', { near: ['yaba', 'surulere', 'ikeja'] }), d('Morning, boss. No go-slow where we dey go.', { when: AM }), d('Evening rush? Na where I shine.', { when: PM }),
    r('A small speaker on the handlebar plays a bright guitar line. Even the helmet nods.'), p('Wind in your face, dust in your hair, a smile you did not plan.'), p('You pass a bus stuck in the go-slow and wave politely.', { when: PM }),
  ],
  keke: [
    d('Keke Marwa, small but strong! Sit well, madam.'), d('Three persons at the back, one at the front, no complaints.'), d('The road has a bump here. I will say sorry in advance.'), c('Bus-stop! Bus-stop! This one na shortcut.', { near: ['surulere', 'yaba', 'ikeja'] }),
    r('Radio: a gentle highlife tune. The keke rattles in time.'), r('Radio: the traffic man says there is a go-slow. We take the side street and wave at it.', { when: PM }), p('The yellow and black paint is the cheerful part of any road.'),
  ],
  cab: [d('Air-con is on, seatbelt is on, music is on. Everything is on.'), r('Radio: the traffic man says Third Mainland is smiling today. It is a rare smile.', { when: MID }), r('Radio: a chilled Afrobeats mix plays. The seat is softer than expected.'), p('You check your phone. Nothing urgent. Lovely.')],
  trek: [p('A corn seller roasts, a bus honks, a child waves. The street is busy and friendly.'), p('Left, right, left. Fitness is a quiet side effect.')],
} }

export const ACCRA: RidePack = { id: 'accra', cities: ['accra'], utc: 0, modes: {
  danfo: [
    c('Circle! Circle! Circle! Last two seats!', { near: ['circle', 'kwame'] }), c('Madina! Madina! Come, come, we are going!', { near: ['madina', 'legon'] }), c('Mate, move small. Let the madam sit.'),
    c('Chale, your fare is coming. Hold it ready.'), c('Mate dey call, driver dey drive, all of us dey go.'), d('Eii, the traffic is hot today. But we are cool.', { when: PM }),
    r('Radio: highlife and a bright morning show. The mate hums along.', { when: AM }), r('Radio: a hiplife bass line rolls in. Heads nod all over the tro-tro.', { when: PM }),
    p('Someone shares kenkey. You are not asked to pay, only to smile.'), p('The pastor on board starts a short blessing. Everyone says amen. The bus likes it.', { when: AM }),
  ],
  keke: [d('Our keke is small but it knows every road in the district.'), r('Radio: a light highlife tune. The keke taps along.')],
  okada: [d('Hold me small. The road is bumpy, the ride is not.'), p('The harmattan breeze is free on this seat.')],
} }

export const NAIROBI: RidePack = { id: 'nairobi', cities: ['nairobi'], utc: 3, modes: {
  danfo: [
    c('Rongai! Rongai! Ingia, ingia!', { near: ['rongai'] }), c('Town, town, town! Hapa ndio mahali!', { near: ['cbd', 'town', 'central'] }), c('Mdosi, move up! Kuna nafasi mbele.'), c('Fare iko tayari? Change ndogo, tafadhali.'),
    d('Nduthi, ndogo ndogo. Traffic ni ya leo tu.', { when: PM }), d('Kimya kimya, tuko njiani. We shall reach.'),
    r('Radio: a morning show in a happy mix of Swahili and English, and a traffic report that almost laughs.', { when: AM }), r('Radio: a benga-flavoured guitar line. The conductor drums the roof.', { when: PM }),
    r('The matatu has a new paint job and the sound system to match. The bass line is a passenger.'), p('A graffiti of a football star watches from the side window. He looks pleased.'),
  ],
  okada: [d('Boda boda, haraka haraka. Hold on, we turn left.'), p('Dust, sun, and a boda man who knows every shortcut.')],
  keke: [d('Tuk-tuk, small but sweet. Sit well.'), r('A cheerful tune from a tiny speaker.')],
} }

export const SOUTH_AFRICA: RidePack = { id: 'south-africa', cities: ['johannesburg', 'pretoria', 'cape-town', 'durban', 'soweto'], utc: 2, modes: {
  danfo: [
    c('Sharp sharp, we are leaving! Pass the money forward, please.'), c('Eish, small space? We make space. Sit, sit.'), c('Next stop, robot! Shout now, hold the shout later!'),
    c('Pass the fare to the front, please. It travels faster than the taxi.', { when: AM }), d('Traffic is thick today. We shall dance with it.', { when: PM }),
    r('Radio: an amapiano log drum rolls in. The whole taxi nods.', { when: PM }), r('Radio: the morning show jokes about Mondays. The taxi agrees.', { when: AM }),
    p('Hand signals fly around the taxi, like an alphabet only the regulars know.'), p('A stranger passes the change forward. It arrives exactly. Magic.'),
  ],
  okada: [d('Hold on, we skip this queue.')],
  cab: [d('Aircon on, seat belt on. Sit back.'), r('Radio: an amapiano mix. The seat is soft.')],
} }

export const PACKS: readonly RidePack[] = [LAGOS, ACCRA, NAIROBI, SOUTH_AFRICA]

/** The pack for a city, or null (use GENERIC). */
export const packFor = (city: string): RidePack | null => PACKS.find((pack) => pack.cities.includes(city)) ?? null

/** The part of the day at a moment in a city's time. */
export function partOfDay(now: number, utc: number): Part {
  const hour = Math.floor((((Number.isFinite(now) ? now : 0) / 3600000 + utc) % 24 + 24) % 24)
  return hour >= 5 && hour < 11 ? 'morning' : hour < 16 ? 'midday' : hour < 21 ? 'evening' : 'night'
}

export interface RideAsk { city: string; mode: string; now: number; from?: string; to?: string; /** Seconds the trip takes: the number of lines follows it. */ seconds: number }

/** How many lines a trip of this many seconds gets: one for about every four seconds, between 2 and 6. */
export const lineCount = (seconds: number): number => Math.max(2, Math.min(6, Math.round((Number.isFinite(seconds) ? seconds : 0) / 4)))

/**
 * The lines for one trip, in the order they are shown. The city's pack is used for the mode when it has lines for it, else the generic pack. Lines for this
 * part of the day and this route come first, then the rest of the part of the day, then the rest; a text never comes twice. The same ask gives the same lines.
 * Trek and a mode with nothing to say give [].
 */
export function rideLines(ask: RideAsk): RideLine[] {
  const pack = packFor(ask.city), own = pack?.modes[ask.mode], list = own?.length ? own : GENERIC.modes[ask.mode] ?? []
  if (!list.length) return []
  const part = partOfDay(ask.now, pack?.utc ?? GENERIC.utc), route = `${ask.from ?? ''} ${ask.to ?? ''}`.toLowerCase()
  const fits = (line: RideLine): boolean => !line.when || line.when.includes(part)
  const onRoute = (line: RideLine): boolean => Boolean(line.near?.some((word) => route.includes(word)))
  const eligible = list.filter((line) => fits(line) && (!line.near || onRoute(line)))
  const rng = makeRng(`ride|${ask.city}|${ask.mode}|${ask.from ?? ''}|${ask.to ?? ''}|${Math.floor(ask.now / 3600000)}|${Math.round(ask.seconds)}`)
  const shuffled = eligible.map((line) => ({ line, key: rng() + (onRoute(line) ? -2 : line.when ? -1 : 0) })).sort((a, b) => a.key - b.key).map((item) => item.line)
  const seen = new Set<string>(), picked: RideLine[] = []
  for (const line of shuffled) { if (picked.length >= lineCount(ask.seconds)) break; if (!seen.has(line.text)) { seen.add(line.text); picked.push(line) } }
  return picked
}

/** Which of `count` lines is on screen when the trip is `fraction` done. */
export const lineIndex = (fraction: number, count: number): number => count <= 0 ? -1 : Math.max(0, Math.min(count - 1, Math.floor((Number.isFinite(fraction) ? fraction : 0) * count)))
