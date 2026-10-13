import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "hagatna",
  "name": "Hagåtña",
  "country": {
    "idISOlower": "gu",
    "name": "Guam"
  },
  "state": {
    "idunique": "gu-hagatna",
    "name": "Hagåtña"
  },
  "timezone": "Pacific/Guam",
  "centre": {
    "lon": 144.7516191,
    "lat": 13.4748148
  },
  "airport": {
    "id": "hagatna-airport",
    "name": "Antonio B. Won Pat International Airport",
    "lon": 144.797282,
    "lat": 13.485,
    "sourceUrl": "https://ourairports.com/airports/PGUM/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/american-oceania-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    144.56673042568102,
    13.293933910066022,
    144.93650777431898,
    13.65569568993398
  ],
  "names": {
    "area": "Hagåtña",
    "unit": "starter play zone",
    "roadHub": "City transit stop (game venue)"
  }
} satisfies DestinationFacts
