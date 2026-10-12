import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "juba",
  "name": "Juba",
  "country": {
    "idISOlower": "ss",
    "name": "South Sudan"
  },
  "state": {
    "idunique": "ss-juba",
    "name": "Juba"
  },
  "timezone": "Africa/Juba",
  "centre": {
    "lon": 31.5959173,
    "lat": 4.8459246
  },
  "airport": {
    "id": "juba-airport",
    "name": "Juba International Airport",
    "lon": 31.601101,
    "lat": 4.87201,
    "sourceUrl": "https://ourairports.com/airports/HJJJ/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/africa/south-sudan-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    31.415561382556415,
    4.665043710066022,
    31.776273217443585,
    5.026805489933978
  ],
  "names": {
    "area": "Juba",
    "unit": "starter play zone",
    "roadHub": "Customs Bus Depot"
  }
} satisfies DestinationFacts
