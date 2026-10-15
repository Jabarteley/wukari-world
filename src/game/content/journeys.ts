import { WORLD_STORY_SEEDS } from './world-progression.generated.ts'
import type { JourneyDefinition } from '../../types/journeys.ts'

const geography = { countryId: 'ng', cityId: 'lagos', venueId: 'unilag' } as const

/** Finite authored collection; adding a country requires an explicit reviewed definition. */
export const AKOKA_CHAPTERS: JourneyDefinition = {
  id: 'ng:lagos:akoka-chapters', version: 1, name: 'Akoka chapters', title: 'Friend of Akoka', geography,
  members: [
    { id: 'hostel-hustle-memento', title: 'Hostel Hustle keepsake', criterion: 'Complete Hostel Hustle.', source: { kind: 'episode', id: 'hostel-hustle', version: 1 } },
    { id: 'the-quiet-hours-memento', title: 'Quiet Hours bookmark', criterion: 'Complete The Quiet Hours.', source: { kind: 'episode', id: 'the-quiet-hours', version: 1 } },
    { id: 'akoka-games-night', title: 'Akoka Welcome Pennant', criterion: 'Complete the Akoka games night project occurrence.', source: { kind: 'project', id: 'akoka-games-night', occurrence: 'akoka-games-night:v1:pilot' } },
    { id: 'unilag-reading-corner', title: 'Reading Corner bookmark', criterion: 'Complete the UNILAG reading corner project occurrence.', source: { kind: 'project', id: 'unilag-reading-corner', occurrence: 'unilag-reading-corner:v1:pilot' } },
  ],
}

const memberFor = (cityId: string, cityName: string, second: boolean) => {
  const id = `city-${cityId}-${second ? 'second-chapter' : 'first-steps'}`
  return { id: `${id}-memento`, title: `${cityName} ${second ? 'return keepsake' : 'welcome keepsake'}`,
    criterion: `Complete ${second ? 'A Place Kept Open' : 'First Steps'} in ${cityName}.`,
    source: { kind: 'episode' as const, id, version: 1 } }
}
const cityJourneys: JourneyDefinition[] = WORLD_STORY_SEEDS.map(seed => ({
  id: `${seed.countryId}:${seed.cityId}:local-chapters`, version: 1, name: `${seed.cityName} chapters`, title: `Familiar face in ${seed.cityName}`,
  geography: { countryId: seed.countryId, cityId: seed.cityId, venueId: seed.host.venue }, level: 'city',
  placeLabel: `${seed.countryName} · ${seed.cityName} · ${seed.host.venueName}`,
  members: [memberFor(seed.cityId, seed.cityName, false), memberFor(seed.cityId, seed.cityName, true)],
}))
const countries = new Map<string, typeof WORLD_STORY_SEEDS[number][]>()
for (const seed of WORLD_STORY_SEEDS) {
  const rows = countries.get(seed.countryId) ?? []
  rows.push(seed)
  countries.set(seed.countryId, rows)
}
const countryJourneys: JourneyDefinition[] = [...countries].flatMap(([countryId, cities]) => {
  const first = cities[0]
  if (!first) return []
  return [{ id: `${countryId}:country:local-chapters`, version: 1, name: `${first.countryName} journeys`, title: `${first.countryName} connections`,
    geography: { countryId, cityId: first.cityId, venueId: 'country' }, level: 'country',
    placeLabel: `${first.countryName} · ${cities.length} supported ${cities.length === 1 ? 'city' : 'cities'}`,
    members: cities.flatMap(seed => [memberFor(seed.cityId, seed.cityName, false), memberFor(seed.cityId, seed.cityName, true)]),
  } satisfies JourneyDefinition]
})
export const JOURNEYS: readonly JourneyDefinition[] = Object.freeze([AKOKA_CHAPTERS, ...cityJourneys, ...countryJourneys])
