import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "tel-aviv-yafo",
  "name": "Tel Aviv",
  "country": {
    "idISOlower": "il",
    "name": "Israel"
  },
  "state": {
    "idunique": "il-tel-aviv-yafo",
    "name": "Tel Aviv"
  },
  "timezone": "Asia/Jerusalem",
  "centre": {
    "lon": 34.7818064,
    "lat": 32.0852997
  },
  "airport": {
    "id": "tel-aviv-yafo-airport",
    "name": "Ben Gurion International Airport",
    "lon": 34.8867,
    "lat": 32.011398,
    "sourceUrl": "https://ourairports.com/airports/LLBG/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/israel-and-palestine-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    34.56933347881145,
    31.904418810066023,
    34.99427932118855,
    32.26618058993398
  ],
  "names": {
    "area": "Tel Aviv",
    "unit": "starter play zone",
    "roadHub": "Kfar Chabad"
  }
} satisfies DestinationFacts
