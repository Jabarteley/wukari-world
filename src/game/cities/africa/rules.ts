import type { CityModuleRules } from '../../../types/content.ts'
import { destinationHubIds, destinationVenueIds, validateDestinationFacts } from './types.ts'
import type { DestinationFacts } from './types.ts'
import { OUTPOST_LINKS, charterFare, generatedAirFare, greatCircleKm, shipFare } from '../generatedLinks.ts'
import { timedLink } from '../../content/travel.ts'

type DestinationRules = CityModuleRules<string, string, 'centre', 'centre-home', string>

/** Compact rules used before the destination's map and gameplay prose load. */
export function buildDestinationRules(facts: DestinationFacts): DestinationRules {
  const valid = validateDestinationFacts(facts)
  const venues = destinationVenueIds(valid.id, valid.airport.id)
  const hubs = destinationHubIds(valid.id)
  const homeId = `${valid.id}-centre-home`
  const intro = valid.playerIntro ?? valid.coverageNote
  const locationLabel = valid.state.name === valid.name ? valid.country.name : valid.state.name
  const area = valid.names?.area ?? 'Starter play zone', unit = valid.names?.unit ?? 'starter play zone', roadHub = valid.names?.roadHub ?? 'City transit stop (game venue)'
  const airKm = Math.round(greatCircleKm(valid.centre, { lon: 3.4, lat: 6.45 }))
  // A beta game connection, not a claim about commercial routes or schedules. An outpost reached by sea or by land keeps it as a
  // connecting flight, so its air hub (`<id>-air`) stays bookable from Lagos at the normal fare.
  const connecting = valid.gateway !== undefined && valid.gateway.mode !== 'air'
  const flight = timedLink({ a: 'lagos', b: valid.id, mode: 'air', beta: true,
    label: `${connecting ? 'Connecting flight' : 'Flight'} between Lagos and ${valid.name}`, icon: '✈️', km: airKm, fare: generatedAirFare(airKm) })
  // Authored outpost links (generatedLinkPolicy 'authored-only'): the outpost fare rule in generatedLinks.ts; a ship or an overland trip is a road link.
  const authored = (valid.links ?? []).map(link => link.kind === 'charter'
    ? timedLink({ a: link.to, b: valid.id, mode: 'air' as const, beta: true, label: `Charter flight between ${link.name} and ${valid.name}`, icon: '🛩️', km: link.km, fare: charterFare(link.km) })
    : timedLink({ a: link.to, b: valid.id, mode: 'road' as const, beta: true, label: `${link.kind === 'ship' ? 'Ship' : 'Overland'} between ${link.name} and ${valid.name}`, icon: link.kind === 'ship' ? '🚢' : '🚙', km: link.km, fare: shipFare(link.km) }))
  // One surface leg the feeder allowance can pay keeps a homeward quote to every home under the ticket cap (generatedLinks.ts OUTPOST_LINKS).
  if (valid.links && !authored.some(link => link.mode === 'road' && link.fare <= OUTPOST_LINKS.surfaceFeederFare)) {
    throw new TypeError(`${valid.id}: an authored-only destination needs a ship or overland link of at most ₦${OUTPOST_LINKS.surfaceFeederFare} so every home stays reachable under the ticket cap`)
  }
  const units: DestinationRules['units'] = [
    { id: 'centre', name: area, zone: 'mainland', land: 55_000, beta: true, districts: ['centre-home'] },
  ]
  const cityHubs: DestinationRules['hubs'] = [
    { id: hubs.air, name: valid.airport.name, mode: 'air', venueId: venues.airport },
    { id: hubs.road, name: roadHub, mode: 'road', venueId: venues.transit },
  ]
  return Object.freeze({
    id: valid.id,
    name: valid.name,
    status: 'open',
    unit,
    units: Object.freeze(units),
    hub: Object.freeze({ road: roadHub, air: valid.airport.name }),
    state: Object.freeze({ id: valid.state.idunique, name: valid.state.name, unit }),
    country: Object.freeze({ id: valid.country.idISOlower, name: valid.country.name }),
    timezone: valid.timezone,
    defaultName: 'New arrival',
    atlas: Object.freeze({ lon: valid.centre.lon, lat: valid.centre.lat, teaser: `${valid.name}, ${locationLabel}. ${intro}`, preview: Object.freeze([intro]) }),
    mapOrigin: valid.mapOrigin,
    rentedHomeIds: Object.freeze([homeId]),
    defaultRentedHome: homeId,
    careerIds: Object.freeze(['community-helper', 'tech']),
    hubs: Object.freeze(cityHubs),
    ...(valid.generatedLinkPolicy ? { generatedLinkPolicy: valid.generatedLinkPolicy } : {}),
    links: Object.freeze([flight, ...authored]),
    seaPlots: false,
    legacyLgaChoice: true,
    districts: Object.freeze([{ id: 'centre-home', name: area, localUnitId: 'centre' }] satisfies DestinationRules['districts']),
  })
}
