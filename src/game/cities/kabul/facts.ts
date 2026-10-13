import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "kabul",
  "name": "Kabul",
  "country": {
    "idISOlower": "af",
    "name": "Afghanistan"
  },
  "state": {
    "idunique": "af-kabul",
    "name": "Kabul"
  },
  "timezone": "Asia/Kabul",
  "centre": {
    "lon": 69.1850584,
    "lat": 34.5269503
  },
  "airport": {
    "id": "kabul-airport",
    "name": "Kabul International Airport",
    "lon": 69.212303,
    "lat": 34.565899,
    "sourceUrl": "https://ourairports.com/airports/OAKB/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/afghanistan-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    68.9665088115245,
    34.34606941006602,
    69.4036079884755,
    34.707831189933984
  ],
  "names": {
    "area": "Kabul",
    "unit": "starter play zone",
    "roadHub": "Minibuses to Bamyan"
  }
} satisfies DestinationFacts
