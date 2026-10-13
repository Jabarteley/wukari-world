import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "jakarta",
  "name": "Jakarta",
  "country": {
    "idISOlower": "id",
    "name": "Indonesia"
  },
  "state": {
    "idunique": "id-jakarta",
    "name": "Jakarta"
  },
  "timezone": "Asia/Jakarta",
  "centre": {
    "lon": 106.827168,
    "lat": -6.1754049
  },
  "airport": {
    "id": "jakarta-airport",
    "name": "Soekarno-Hatta International Airport",
    "lon": 106.655998,
    "lat": -6.12557,
    "sourceUrl": "https://ourairports.com/airports/WIII/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/indonesia-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    106.64639449165824,
    -6.356285789933978,
    107.00794150834176,
    -5.994524010066022
  ],
  "names": {
    "area": "Jakarta",
    "unit": "starter play zone",
    "roadHub": "Kranji"
  }
} satisfies DestinationFacts
