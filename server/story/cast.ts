import { castOf, venueFor, type Spec } from '../house/cast.ts'
import { cachedCityContent, cityRules } from '../../src/game/cities/index.ts'

const CITY_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const CAST_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const SHA256 = /^[a-f0-9]{64}$/u

export interface HouseTalkBinding {
  city: { id: string; name: string; source: string }
  npc: { id: string; name: string; source: string }
  venue: { id: string; name: string; source: string }
  facts: { id: string; text: string; source: string }[]
}

function cloneSpec(spec: Spec, card: string): Spec {
  return {
    ...spec,
    hours: { ...spec.hours },
    post: [...spec.post],
    ...(spec.market ? { market: [...spec.market] } : {}),
    ...(spec.eatery ? { eatery: [...spec.eatery] } : {}),
    ...(spec.items ? { items: spec.items.map(item => ({ ...item })) } : {}),
    card,
  }
}

/** Contextualise loaded-city cast cards without changing the authoritative cast identities or attributes. */
export function cityCastOf(cityId: string, fallback: readonly Spec[] = castOf(cityId)): readonly Spec[] {
  const content = cachedCityContent(cityId), rules = cityRules(cityId)
  if (!content || !rules) return fallback
  const venues = new Map(content.venues.map(venue => [venue.id, venue.name]))
  const posts = fallback.map(spec => venueFor(cityId, spec.post, spec.role))
  if (posts.some(post => post === null || !venues.has(post))) return fallback
  return fallback.map((spec, at) => {
    const venueName = venues.get(posts[at]!)!
    return cloneSpec(spec, `In ${rules.name}, you work at ${venueName}. ${spec.card}`)
  })
}

/** Return the canonical offline-bank identity only for a known house-cast key in this city. */
export function houseTalkBankId(cityId: string, specKey: string): string | null {
  if (!CITY_ID.test(cityId) || !CAST_KEY.test(specKey) || !cityRules(cityId) || !castOf(cityId).some(spec => spec.key === specKey)) return null
  return `${cityId}-house-${specKey}`
}

/** Enumerate exact loaded-city house identities and facts for the offline talk factory. */
export function houseTalkBindingsOf(cityId: string, castSourceSha256: string): readonly HouseTalkBinding[] {
  if (!SHA256.test(castSourceSha256)) throw new TypeError('house cast source hash must be sha256')
  const content = cachedCityContent(cityId), rules = cityRules(cityId)
  if (!content || !rules) return []
  const source = `server/house/cast.ts#sha256=${castSourceSha256}`
  const venues = new Map(content.venues.map(venue => [venue.id, venue]))
  const contextual = cityCastOf(cityId)
  return contextual.map(spec => {
    const venueId = venueFor(cityId, spec.post, spec.role), venue = venueId ? venues.get(venueId) : undefined
    if (!venue) throw new Error(`house cast ${cityId}/${spec.key} has no loaded venue`)
    const npcId = houseTalkBankId(cityId, spec.key)
    if (!npcId) throw new Error(`house cast ${cityId}/${spec.key} has no canonical talk id`)
    return {
      city: { id: cityId, name: rules.name, source },
      npc: { id: npcId, name: spec.name, source },
      venue: { id: venue.id, name: venue.name, source },
      facts: [
        { id: 'npc-role', text: spec.role, source },
        { id: 'house-card', text: spec.card, source },
        { id: 'house-hours-open', text: String(spec.hours.open), source },
        { id: 'house-hours-close', text: String(spec.hours.close), source },
      ],
    }
  }).sort((left, right) => left.npc.id.localeCompare(right.npc.id, 'en'))
}
