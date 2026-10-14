import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "st-helier",
  "name": "St Helier",
  "country": {
    "idISOlower": "je",
    "name": "Jersey"
  },
  "state": {
    "idunique": "je-st-helier",
    "name": "St Helier"
  },
  "timezone": "Europe/London",
  "centre": {
    "lon": -2.1102277,
    "lat": 49.1856637
  },
  "airport": {
    "id": "st-helier-airport",
    "name": "Jersey Airport",
    "lon": -2.19551,
    "lat": 49.207901,
    "sourceUrl": "https://ourairports.com/airports/EGJJ/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://github.com/kromate/joinallworld/releases/download/extracts-20261014/osmfr-jersey-261013.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -2.2755166177377726,
    49.07713516603961,
    -1.9449387822622268,
    49.29419223396039
  ],
  "names": {
    "area": "St Helier",
    "unit": "starter play zone",
    "roadHub": "Elizabeth Terminal"
  }
} satisfies DestinationFacts
