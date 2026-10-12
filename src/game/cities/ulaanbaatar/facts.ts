import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "ulaanbaatar",
  "name": "Ulaanbaatar",
  "country": {
    "idISOlower": "mn",
    "name": "Mongolia"
  },
  "state": {
    "idunique": "mn-ulaanbaatar",
    "name": "Ulaanbaatar"
  },
  "timezone": "Asia/Ulaanbaatar",
  "centre": {
    "lon": 106.9177016,
    "lat": 47.9184676
  },
  "airport": {
    "id": "ulaanbaatar-airport",
    "name": "Ulaanbaatar Chinggis Khaan International Airport",
    "lon": 106.819833,
    "lat": 47.646916,
    "sourceUrl": "https://ourairports.com/airports/ZMCK/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/mongolia-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    106.64868213295743,
    47.6378719555033,
    107.18672106704257,
    48.09934848993398
  ],
  "names": {
    "area": "Ulaanbaatar",
    "unit": "starter play zone",
    "roadHub": "Ulan Bator"
  }
} satisfies DestinationFacts
