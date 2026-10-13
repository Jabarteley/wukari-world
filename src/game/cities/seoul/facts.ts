import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "seoul",
  "name": "Seoul",
  "country": {
    "idISOlower": "kr",
    "name": "Korea (South)"
  },
  "state": {
    "idunique": "kr-seoul",
    "name": "Seoul"
  },
  "timezone": "Asia/Seoul",
  "centre": {
    "lon": 126.9782914,
    "lat": 37.5666791
  },
  "airport": {
    "id": "seoul-airport",
    "name": "Incheon International Airport",
    "lon": 126.450996,
    "lat": 37.469101,
    "sourceUrl": "https://ourairports.com/airports/RKSI/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/south-korea-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    126.43967634777182,
    37.38579821006602,
    127.2055061214048,
    37.74755998993398
  ],
  "names": {
    "area": "Seoul",
    "unit": "starter play zone",
    "roadHub": "Jegi-dong"
  }
} satisfies DestinationFacts
