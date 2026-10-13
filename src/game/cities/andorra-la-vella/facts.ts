import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "andorra-la-vella",
  "name": "Andorra la Vella",
  "country": {
    "idISOlower": "ad",
    "name": "Andorra"
  },
  "state": {
    "idunique": "ad",
    "name": "Andorra la Vella"
  },
  "timezone": "Europe/Andorra",
  "centre": {
    "lon": 1.5212467,
    "lat": 42.5069391
  },
  "airport": {
    "id": "andorra-la-vella-airport",
    "name": "Andorra la Vella Heliport",
    "lon": 1.53365,
    "lat": 42.511227,
    "sourceUrl": "https://ourairports.com/airports/AD-ALV/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/andorra-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    1.276827819456585,
    42.326058210066016,
    1.7656655805434152,
    42.68781998993398
  ],
  "names": {
    "area": "Andorra la Vella",
    "unit": "starter play zone",
    "roadHub": "National Bus Station"
  }
} satisfies DestinationFacts
