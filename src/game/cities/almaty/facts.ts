import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "almaty",
  "name": "Almaty",
  "country": {
    "idISOlower": "kz",
    "name": "Kazakhstan"
  },
  "state": {
    "idunique": "kz-almaty",
    "name": "Almaty"
  },
  "timezone": "Asia/Almaty",
  "centre": {
    "lon": 76.9457275,
    "lat": 43.2363924
  },
  "airport": {
    "id": "almaty-airport",
    "name": "Almaty International Airport",
    "lon": 77.042828,
    "lat": 43.354267,
    "sourceUrl": "https://ourairports.com/airports/UAAA/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/kazakhstan-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    76.69838406081209,
    43.05551151006602,
    77.19307093918792,
    43.41727328993398
  ],
  "names": {
    "area": "Almaty",
    "unit": "starter play zone",
    "roadHub": "Almaty-1 station"
  }
} satisfies DestinationFacts
