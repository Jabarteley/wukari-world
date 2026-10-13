import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "alofi",
  "name": "Alofi",
  "country": {
    "idISOlower": "nu",
    "name": "Niue"
  },
  "state": {
    "idunique": "nu-alofi",
    "name": "Alofi"
  },
  "timezone": "Pacific/Niue",
  "centre": {
    "lon": -169.919199,
    "lat": -19.0534159
  },
  "airport": {
    "id": "alofi-airport",
    "name": "Niue International Airport",
    "lon": -169.923493,
    "lat": -19.080109,
    "sourceUrl": "https://ourairports.com/airports/NIUE/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/niue-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -170.10948301342634,
    -19.23429678993398,
    -169.72891498657364,
    -18.872535010066024
  ],
  "names": {
    "area": "Alofi",
    "unit": "starter play zone",
    "roadHub": "City transit stop (game venue)"
  }
} satisfies DestinationFacts
