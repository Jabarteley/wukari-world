import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "yaren",
  "name": "Yaren",
  "country": {
    "idISOlower": "nr",
    "name": "Nauru"
  },
  "state": {
    "idunique": "nr-yaren",
    "name": "Yaren"
  },
  "timezone": "Pacific/Nauru",
  "centre": {
    "lon": 166.9163479,
    "lat": -0.5471064
  },
  "airport": {
    "id": "yaren-airport",
    "name": "Nauru International Airport",
    "lon": 166.919525,
    "lat": -0.547893,
    "sourceUrl": "https://ourairports.com/airports/ANYN/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/nauru-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    166.73667116198516,
    -0.7279872899339784,
    167.09602463801485,
    -0.36622551006602155
  ],
  "names": {
    "area": "Yaren",
    "unit": "starter play zone",
    "roadHub": "City transit stop (game venue)"
  }
} satisfies DestinationFacts
