/** Discover every city reference in a saved life and load its full rules before reconstruction. */
import { cityIndexReady, cityIndexWaitFor, isCityId, isKnownCityId, loadCityContent, loadCityNetwork, loadCityRules, registeredCityIds } from './registry.ts'

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const MAX_RELATIONSHIPS = 200
const MAX_VISITED_VENUES = 512
const MAX_ACTIVITY_COOLDOWNS = 80
const MAX_MISSION_VISITS = 64
const MAX_EVENT_ATTENDANCE = 24

/** Every registered city mentioned by the bounded fields that a saved life can preserve. */
export function lifeCities(raw: unknown, extra: readonly unknown[] = []): string[] {
  return citiesOf(raw, extra, isCityId, isKnownCityId, awayCities)
}
/** The registered cities a life keeps a place in. Before the whole index is in (a browser build), its keys are read one by one: a life
 * naming a city outside the startup index has waited for it (loadLifeCities), so they are all startup cities. */
function awayCities(away: Record<string, unknown>): readonly string[] {
  const keys = Object.keys(away)
  if (!keys.length) return []
  return cityIndexReady() ? registeredCityIds().filter((id) => Object.hasOwn(away, id)) : keys.filter(isCityId)
}

/** A string in a city-id position that could be a city id (lower-case words joined by hyphens). */
const CITY_ID_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const cityShaped = (value: string): boolean => value.length <= 64 && CITY_ID_SHAPE.test(value)
/**
 * Every string in the same fields that could name a city, read without the city index: what a browser that holds only the startup
 * index must check (cityIndexWaitFor) before lifeCities can answer for this life.
 */
export function lifeCityCandidates(raw: unknown, extra: readonly unknown[] = []): string[] {
  return citiesOf(raw, extra, cityShaped, cityShaped, (away) => Object.keys(away).filter(cityShaped))
}

function citiesOf(raw: unknown, extra: readonly unknown[], open: (id: string) => boolean, known: (id: string) => boolean, awayIds: (away: Record<string, unknown>) => readonly string[]): string[] {
  const found = new Set<string>()
  const add = (value: unknown): void => { if (typeof value === 'string' && open(value)) found.add(value) }
  const addKnown = (value: unknown): void => { if (typeof value === 'string' && known(value)) found.add(value) }
  const addQualified = (value: unknown): void => {
    if (typeof value !== 'string') return
    add(value)
    const separator = value.indexOf(':')
    if (separator > 0) add(value.slice(0, separator))
  }

  const state = record(raw) ? raw : {}
  const estate = record(state.estate) ? state.estate : {}
  add(estate.city)
  add(estate.home)
  if (record(state.activeAction) && state.activeAction.kind === 'homeward' && record(state.activeAction.ticket)) {
    const ticket = state.activeAction.ticket
    addKnown(ticket.from)
    addKnown(ticket.to)
    if (Array.isArray(ticket.legs)) for (const leg of ticket.legs.slice(0, 4)) {
      if (record(leg)) { addKnown(leg.from); addKnown(leg.to) }
    }
  }
  for (const value of extra) add(value)
  if (record(estate.away)) for (const id of awayIds(estate.away)) add(id)
  if (record(state.career)) add(state.career.city)
  if (record(state.activeAction) && state.activeAction.kind === 'intercity') { add(state.activeAction.from); add(state.activeAction.id) }
  if (record(state.social) && record(state.social.rel)) {
    for (const rel of Object.values(state.social.rel).slice(0, MAX_RELATIONSHIPS)) if (record(rel) && record(rel.npcSnapshot)) add(rel.npcSnapshot.city)
  }
  if (record(state.civic) && record(state.civic.hunt)) add(state.civic.hunt.city)
  if (record(state.travel)) {
    if (Array.isArray(state.travel.visited)) for (const key of state.travel.visited.slice(0, MAX_VISITED_VENUES)) addQualified(key)
    if (record(state.travel.cooldowns)) for (const key of Object.keys(state.travel.cooldowns).slice(0, MAX_ACTIVITY_COOLDOWNS)) addQualified(key)
  }
  if (record(state.missions) && record(state.missions.visited) && Array.isArray(state.missions.visited.list)) {
    for (const key of state.missions.visited.list.slice(0, MAX_MISSION_VISITS)) addQualified(key)
  }
  if (record(state.events) && Array.isArray(state.events.attended)) {
    for (const key of state.events.attended.slice(0, MAX_EVENT_ATTENDANCE)) addQualified(key)
  }
  return [...found]
}

/**
 * Whether rebuilding this saved life reads the world city network (registry.ts loadCityNetwork): anything but a life at home in
 * its own city, or not yet housed anywhere, with no trip under way and no ride debt. A visitor's homeward quote and ride credit,
 * and the timetable check of a trip under way, read other cities' routes; a resident's life reads only its own city's rules.
 * Anything it cannot read counts as needing the network.
 */
export function lifeNeedsCityNetwork(raw: unknown): boolean {
  if (!record(raw) || !record(raw.estate)) return true
  const estate = raw.estate, here = estate.city, home = estate.home
  if (typeof here !== 'string') return true
  if (home !== null && home !== undefined && home !== here) return true
  if (raw.activeAction !== null && raw.activeAction !== undefined) {
    if (!record(raw.activeAction)) return true
    if (raw.activeAction.kind === 'intercity' || raw.activeAction.kind === 'homeward') return true
  }
  if (raw.travel !== null && raw.travel !== undefined) {
    if (!record(raw.travel)) return true
    const debt = raw.travel.rideDebt
    if (debt !== undefined && debt !== null && debt !== 0) return true
  }
  return false
}

/**
 * Load every referenced city's full rules, the world network when the life needs it (lifeNeedsCityNetwork), and the current city's
 * content. A failure rejects; callers must retain the saved value and avoid rebuilding it with partial rules.
 */
export async function loadLifeCities(raw: unknown, extra: readonly unknown[] = []): Promise<string[]> {
  // A browser build starts with Nigeria's cities only: a life that names any other city waits for the whole index before it is read.
  const index = cityIndexWaitFor(lifeCityCandidates(raw, extra))
  if (index) await index
  const cities = lifeCities(raw, extra)
  await Promise.all([...(lifeNeedsCityNetwork(raw) ? [loadCityNetwork()] : []), ...cities.map(loadCityRules)])
  const state = record(raw) ? raw : {}
  const estate = record(state.estate) ? state.estate : {}
  const current = typeof estate.city === 'string' && isCityId(estate.city)
    ? estate.city
    : extra.find((value): value is string => typeof value === 'string' && isCityId(value))
  if (current) await loadCityContent(current)
  const active = record(state.activeAction) ? state.activeAction : {}
  const ticket = record(active.ticket) ? active.ticket : {}
  if (active.kind === 'homeward' && typeof ticket.to === 'string' && isKnownCityId(ticket.to)) await loadCityContent(ticket.to)
  return []
}
