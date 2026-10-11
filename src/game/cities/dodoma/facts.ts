import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "dodoma",
  "name": "Dodoma",
  "country": {
    "idISOlower": "tz",
    "name": "Tanzania"
  },
  "state": {
    "idunique": "tz-dodoma",
    "name": "Dodoma"
  },
  "timezone": "Africa/Dar_es_Salaam",
  "centre": {
    "lon": 35.7493783,
    "lat": -6.1839376
  },
  "airport": {
    "id": "dodoma-airport",
    "name": "Dodoma Airport",
    "lon": 35.756036,
    "lat": -6.170559,
    "sourceUrl": "https://ourairports.com/airports/HTDO/"
  },
  "sourceLabel": "OpenStreetMap contributors and OurAirports dataset",
  "sourceUrl": "https://www.openstreetmap.org/copyright",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "bounds": [
    35.62,
    -6.28,
    35.87,
    -6.07
  ],
  "coverageNote": "Dodoma: a sketch of the built-up extent traced from mapped land use, not an administrative boundary, with inland water, main roads, neighbourhood labels and named places from the Tanzania OpenStreetMap PBF snapshot of 2026-10-09. Dodoma Airport coordinates are a published OurAirports dataset point, not an official ARP or evidence of current operations or schedules. Visitor services and homes are fictional game content set at real named places.",
  "names": {
    "area": "Dodoma",
    "unit": "neighbourhood",
    "roadHub": "Shabiby Bus Terminal"
  }
} satisfies DestinationFacts
