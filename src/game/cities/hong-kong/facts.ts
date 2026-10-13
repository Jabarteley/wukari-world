import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "hong-kong",
  "name": "Hong Kong",
  "country": {
    "idISOlower": "hk",
    "name": "Hong Kong"
  },
  "state": {
    "idunique": "hk-hong-kong",
    "name": "Hong Kong"
  },
  "timezone": "Asia/Hong_Kong",
  "centre": {
    "lon": 114.1582831,
    "lat": 22.2818333
  },
  "airport": {
    "id": "hong-kong-airport",
    "name": "Hong Kong International Airport",
    "lon": 113.914862,
    "lat": 22.31184,
    "sourceUrl": "https://ourairports.com/airports/VHHH/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/china/guangdong-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    113.90515127684363,
    22.10095241006602,
    114.35269573837654,
    22.462714189933976
  ],
  "names": {
    "area": "Hong Kong",
    "unit": "starter play zone",
    "roadHub": "Star Ferry"
  }
} satisfies DestinationFacts
