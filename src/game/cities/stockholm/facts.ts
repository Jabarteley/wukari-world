import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "stockholm",
  "name": "Stockholm",
  "country": {
    "idISOlower": "se",
    "name": "Sweden"
  },
  "state": {
    "idunique": "se-stockholm",
    "name": "Stockholm"
  },
  "timezone": "Europe/Berlin",
  "centre": {
    "lon": 18.0710935,
    "lat": 59.3251172
  },
  "airport": {
    "id": "stockholm-airport",
    "name": "Stockholm-Arlanda Airport",
    "lon": 17.928829,
    "lat": 59.64849,
    "sourceUrl": "https://ourairports.com/airports/ESSA/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/sweden-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    17.85911761747465,
    59.21658866603961,
    18.28306938252535,
    59.6575340444967
  ],
  "names": {
    "area": "Stockholm",
    "unit": "starter play zone",
    "roadHub": "Huddinge"
  }
} satisfies DestinationFacts
