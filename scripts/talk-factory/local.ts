import {
  TALK_TEXT_MAX, TALK_TOPICS, TalkBankError, compileTalkBank,
  type ApprovedTalkLineV1, type TalkBankInputV1, type TalkBankV1, type TalkTopic,
} from './bank.ts'
import { parseTalkDraftBinding, type TalkDraftBindingV1 } from './draft.ts'
import { agentWords } from '../../server/moderation/agent-words.ts'
import { screenText } from '../../server/moderation/text.ts'
import type { SceneKind } from '../../src/types/content.ts'

function fail(message: string): never { throw new TalkBankError(message) }

function seedOf(binding: TalkDraftBindingV1): number {
  let seed = 0
  for (const unit of `${binding.city.id}\u0000${binding.npc.id}`) seed = (seed * 33 + unit.codePointAt(0)!) >>> 0
  return seed
}

function rotate<T>(values: readonly T[], offset: number): T[] {
  const at = offset % values.length
  return [...values.slice(at), ...values.slice(0, at)]
}

function approved(text: string, sources: string[]): ApprovedTalkLineV1 { return { text, sources } }

function fits(text: string): boolean { return text.length <= TALK_TEXT_MAX }

function safe(text: string): boolean {
  return fits(text) && agentWords(text, { toMinor: true }).ok && !screenText(text, { contact: true, what: 'Local talk' })
}

function safeApproved(text: string, sources: string[]): ApprovedTalkLineV1[] {
  return safe(text) ? [approved(text, sources)] : []
}

type Fact = TalkDraftBindingV1['facts'][number]

function factsWith(binding: TalkDraftBindingV1, prefix: string): Fact[] {
  return binding.facts.filter(fact => fact.id.startsWith(prefix))
}

function placeFacts(binding: TalkDraftBindingV1): { name: Fact; kind: Fact }[] {
  const kinds = new Map(factsWith(binding, 'city-place-kind-').map(fact => [fact.id.slice('city-place-kind-'.length), fact]))
  return factsWith(binding, 'city-place-name-').flatMap(name => {
    const kind = kinds.get(name.id.slice('city-place-name-'.length))
    return kind ? [{ name, kind }] : []
  })
}

const PILOT_CITIES = new Set(['accra', 'kano', 'tokyo'])
const VENUE_LABELS: Readonly<Record<SceneKind, string>> = {
  park: 'park', buka: 'food place', hub: 'transport hub', club: 'social venue', office: 'workplace', market: 'market', gym: 'gym',
  mall: 'shopping centre', beach: 'beach', hospital: 'hospital', salon: 'salon', rooftop: 'rooftop venue', police: 'police venue',
  worship: 'worship venue', radio: 'radio venue', polling: 'civic venue', viewing: 'viewing place', shrine: 'shrine', walk: 'walking place',
  statehouse: 'civic venue', airport: 'airport', refinery: 'industrial venue', unilag: 'campus venue', home: 'home', quad: 'campus quad',
  hilltop: 'hilltop', lakeside: 'lakeside venue',
}

interface SpokenVenue {
  field: TalkDraftBindingV1['venue']
  source: string | null
}

function greetingText(city: string, venue: string): string | null {
  const welcome = `Welcome to ${venue} in ${city}.`
  const compact = `${city}: ${venue}`
  const text = fits(welcome) ? welcome : compact
  return fits(text) ? text : null
}

function spokenVenue(binding: TalkDraftBindingV1): SpokenVenue {
  const exact = greetingText(binding.city.name, binding.venue.name)
  if (PILOT_CITIES.has(binding.city.id) || (exact !== null && safe(exact))) return { field: binding.venue, source: null }
  const place = placeFacts(binding).find(row => row.name.text === binding.venue.name)
  const label = place && Object.hasOwn(VENUE_LABELS, place.kind.text) ? VENUE_LABELS[place.kind.text as SceneKind] : null
  if (!place || !label) return { field: binding.venue, source: null }
  const field = { ...binding.venue, name: `this ${label}`, source: place.kind.source }
  const displayed = greetingText(binding.city.name, field.name)
  return displayed !== null && safe(displayed) ? { field, source: place.kind.id } : { field: binding.venue, source: null }
}

function six(candidates: readonly ApprovedTalkLineV1[], fallback: readonly ApprovedTalkLineV1[], seed: number): ApprovedTalkLineV1[] {
  const unique: ApprovedTalkLineV1[] = [], seen = new Set<string>()
  for (const line of [...candidates, ...fallback]) {
    if (!fits(line.text) || seen.has(line.text)) continue
    seen.add(line.text); unique.push(line)
  }
  if (unique.length < 6) fail('local topic does not have six distinct lines that fit the text limit')
  return rotate(unique.slice(0, 6), seed)
}

function greeting(binding: TalkDraftBindingV1, venue: SpokenVenue): ApprovedTalkLineV1 {
  const text = greetingText(binding.city.name, venue.field.name)
  if (text === null) fail('city and venue names cannot fit one local greeting without changing their identities')
  return approved(text, ['city', 'venue', ...(venue.source ? [venue.source] : [])])
}

function ambient(binding: TalkDraftBindingV1, seed: number): ApprovedTalkLineV1[] {
  const named = `Hello, I am ${binding.npc.name}.`
  const city = `It is good to talk with you in ${binding.city.name}.`
  return rotate([
    approved(fits(named) ? named : 'Hello. I am ready to talk.', ['npc']),
    approved(fits(city) ? city : 'It is good to talk with you here.', fits(city) ? ['city'] : ['npc']),
    approved('A good conversation can begin with a small detail.', ['npc']),
    approved('You can ask a question or share what you noticed.', ['npc']),
    approved('I will keep my answers clear and simple.', ['npc']),
    approved('We can talk about daily life or the city map.', ['npc']),
    approved('Take your time; there is no need to rush.', ['npc']),
    approved('I enjoy hearing what catches a visitor’s attention.', ['npc']),
    approved('Let us choose one subject and begin there.', ['npc']),
    approved('We can change the subject when you are ready.', ['npc']),
  ], seed)
}

function about(binding: TalkDraftBindingV1, seed: number): TalkBankInputV1['about'] {
  const role = binding.facts.find(fact => fact.id === 'npc-role')
  const foods = factsWith(binding, 'city-food-')
  const known = factsWith(binding, 'city-known-for-')
  const areas = factsWith(binding, 'venue-target-')
  const places = placeFacts(binding)
  const markets = places.filter(place => place.kind.text === 'market')
  const venueLabel = (kind: Fact): string | null => Object.hasOwn(VENUE_LABELS, kind.text) ? VENUE_LABELS[kind.text as SceneKind] : null
  const mapLines = (place: { name: Fact; kind: Fact }, wording: 'includes' | 'lists'): ApprovedTalkLineV1[] => {
    const named = wording === 'includes'
      ? `You can find ${place.name.text} on the ${binding.city.name} map.`
      : `Look for ${place.name.text} on the ${binding.city.name} map.`
    const exact = safeApproved(named, ['city', place.name.id, place.kind.id])
    if (exact.length) return exact
    const label = venueLabel(place.kind)
    if (!label) return []
    const display = wording === 'includes'
      ? `The ${binding.city.name} map also shows a ${label}.`
      : `A ${label} appears on the ${binding.city.name} map.`
    return safeApproved(display, ['city', place.kind.id])
  }
  const neutral = (lines: readonly string[]) => lines.map(text => approved(text, ['npc']))

  return {
    market: six(markets.flatMap(place => {
      const exact = safeApproved(`Look for ${place.name.text} when you want a market stop.`, [place.name.id, place.kind.id])
      return exact.length ? exact : safeApproved(`The ${binding.city.name} map includes another market.`, ['city', place.kind.id])
    }), neutral([
      'A market conversation can begin with the goods people came to find.',
      'I like to notice how each market arranges its space.',
      'A clear question helps when a market feels busy.',
      'People often compare several stalls before choosing where to stop.',
      'Markets bring work, errands and conversation into one place.',
      'Tell me what you usually notice first in a market.',
    ]), seed),
    food: six(foods.map(fact => approved(`Have you tried ${fact.text}?`, [fact.id])), neutral([
      'Food is an easy subject to share without rushing.',
      'A familiar meal can make a new place feel welcoming.',
      'I like hearing which flavours a visitor remembers.',
      'People can describe a meal before they agree on a favourite.',
      'A food conversation often begins with one remembered taste.',
      'Tell me what kind of meal feels comforting to you.',
    ]), seed + 1),
    weather: six([], neutral([
      'Weather can change the pace of a day outdoors.',
      'A bright morning and a cool evening invite different plans.',
      'I look at the sky before deciding how long to stay outside.',
      'Some days call for shade, while others invite a longer walk.',
      'Weather is often the first detail two visitors compare.',
      'Tell me what kind of day you enjoy most.',
    ]), seed + 2),
    work: six(role ? [approved(`My role here is ${role.text}.`, [role.id])] : [], neutral([
      'Good work becomes easier when people explain what they need.',
      'I try to finish one clear task before starting another.',
      'Every role has quiet parts that visitors may not notice.',
      'A useful day can include both routine and a new problem.',
      'People learn a workplace by watching how others cooperate.',
      'Tell me which kind of work keeps your attention.',
    ]), seed + 3),
    city: six([
      ...known.map(fact => approved(`People in ${binding.city.name} talk about ${fact.text}.`, ['city', fact.id])),
      ...places.flatMap(place => mapLines(place, 'includes')),
    ], neutral([
      `I am interested in what brings people to ${binding.city.name}.`,
      'A city becomes familiar one ordinary visit at a time.',
      'Different neighbourhoods can give one city many rhythms.',
      'A visitor often remembers one place before learning the whole map.',
      'Daily routines show a side of a city that landmarks cannot.',
      'Tell me which part of the city map caught your attention.',
    ]), seed + 4),
    festival: six([], neutral([
      'A festival can bring neighbours into one shared space.',
      'Music, clothing and food can each shape a public gathering.',
      'People often remember who they met as much as what they saw.',
      'A busy celebration still depends on many quiet preparations.',
      'Visitors can enjoy a gathering while respecting its hosts.',
      'Tell me what you usually notice first at a celebration.',
    ]), seed + 5),
    directions: six([
      ...areas.map(fact => approved(`Around here, look for ${fact.text}.`, ['venue', fact.id])),
      ...places.flatMap(place => mapLines(place, 'lists')),
    ], neutral([
      'I begin directions with a place name that appears on the map.',
      'It helps to confirm the destination before choosing a way there.',
      'A short direction is clearer when it names one landmark at a time.',
      'I would rather check a map than pretend I know an unfamiliar route.',
      'The same destination can sound clearer when we repeat its exact name.',
      'Tell me the place name you want to find on the city map.',
    ]), seed + 6),
  } satisfies Record<TalkTopic, ApprovedTalkLineV1[]>
}

function goodbye(seed: number): ApprovedTalkLineV1[] {
  return rotate([
    'Thank you for the conversation.',
    'Take care until we speak again.',
    'Come back whenever you want another chat.',
    'I hope the rest of your visit goes well.',
    'Goodbye for now.',
    'It was good to talk with you.',
    'We can continue another time.',
  ].map(text => approved(text, ['npc'])), seed)
}

export function compileLocalTalkBank(rawBinding: unknown): TalkBankV1 {
  const binding = parseTalkDraftBinding(rawBinding)
  if (binding.lang !== 'en') fail('local talk supports English output only')
  if (binding.voice !== 'plain') fail('local talk supports plain voice only')
  const seed = seedOf(binding), venue = spokenVenue(binding)
  return compileTalkBank({
    city: binding.city, npc: binding.npc, venue: venue.field,
    voice: binding.voice, lang: binding.lang, facts: binding.facts,
    greet: [greeting(binding, venue)], ambient: ambient(binding, seed), about: about(binding, seed), bye: goodbye(seed),
    phrases: binding.phrases,
  }, binding.phrasebook)
}
