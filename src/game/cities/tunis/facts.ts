import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  id: 'tunis',
  name: 'Tunis',
  country: { idISOlower: 'tn', name: 'Tunisia' },
  state: { idunique: 'tn-tunis', name: 'Tunis' },
  timezone: 'Africa/Tunis',
  centre: { lon: 10.179678, lat: 36.802778 },
  airport: {
    id: 'tunis-airport',
    name: 'Tunis Carthage International Airport',
    lon: 10.2272,
    lat: 36.851002,
    sourceUrl: 'https://ourairports.com/airports/DTTA/',
  },
  sourceLabel: 'OpenStreetMap contributors via Geofabrik PBF and OurAirports dataset',
  sourceUrl: 'https://download.geofabrik.de/africa/tunisia-261009.osm.pbf',
  licence: 'OpenStreetMap ODbL-1.0; OurAirports public-domain dataset',
  bounds: [10.08, 36.74, 10.32, 36.93],
  coverageNote: 'Tunis: a mapped land-use outline with the Gulf of Tunis coast and Lac de Tunis water, main roads, and named places selected from the dated Tunisia Geofabrik PBF. The arrival airport point is from OurAirports and is not an official aerodrome reference point or evidence of current operations or schedules.',
  names: { area: 'Tunis', unit: 'district', roadHub: 'Tunis Station' },
} satisfies DestinationFacts
