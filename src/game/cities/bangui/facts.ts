import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "bangui",
  "name": "Bangui",
  "country": {
    "idISOlower": "cf",
    "name": "Central African Republic"
  },
  "state": {
    "idunique": "cf-starter",
    "name": "Bangui"
  },
  "timezone": "Africa/Bangui",
  "centre": {
    "lon": 18.582906,
    "lat": 4.361953
  },
  "airport": {
    "id": "bangui-airport",
    "name": "Bangui M'Poko International Airport",
    "lon": 18.518801,
    "lat": 4.39848,
    "sourceUrl": "https://ourairports.com/airports/FEFF/"
  },
  "sourceLabel": "OpenStreetMap contributors via Geofabrik Central African Republic 2026-10-09, and OurAirports dataset",
  "sourceUrl": "https://www.openstreetmap.org/copyright",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "bounds": [
    18.44,
    4.27,
    18.68,
    4.47
  ],
  "coverageNote": "Bangui: a sketch of the mapped built-up extent, not an administrative boundary, with river, reservoir and basin polygons, roads and named places in the dated Geofabrik Central African Republic PBF. The airport point is from the OurAirports dataset and is not evidence of current operations or schedules. Visitor services and homes are fictional game content set at real named places.",
  "names": {
    "area": "Bangui",
    "unit": "district",
    "roadHub": "Terminal Nord"
  }
} satisfies DestinationFacts
