import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "dar-es-salaam",
  "name": "Dar es Salaam",
  "country": {
    "idISOlower": "tz",
    "name": "Tanzania"
  },
  "state": {
    "idunique": "tz-dar-es-salaam",
    "name": "Dar es Salaam"
  },
  "timezone": "Africa/Dar_es_Salaam",
  "centre": {
    "lon": 39.266396,
    "lat": -6.798067
  },
  "airport": {
    "id": "dar-es-salaam-airport",
    "name": "Julius Nyerere International Airport",
    "lon": 39.207288,
    "lat": -6.873499,
    "sourceUrl": "https://www.taa.go.tz/services/jnia"
  },
  "sourceLabel": "OpenStreetMap contributors and OurAirports dataset",
  "sourceUrl": "https://www.openstreetmap.org/copyright",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "bounds": [
    39.12,
    -6.98,
    39.4,
    -6.7
  ],
  "coverageNote": "Dar es Salaam: a sketch of the built-up extent traced from mapped land use, not an administrative boundary, with Indian Ocean coastal water and harbour, main roads and named places from the Tanzania OpenStreetMap PBF snapshot of 2026-10-09. Julius Nyerere International Airport coordinates are an offline OurAirports dataset point, not an official reference point or evidence of current operations or schedules. Visitor services and homes are fictional game content set at real named places.",
  "names": {
    "area": "Dar es Salaam",
    "unit": "district",
    "roadHub": "Old Central Railway Station"
  }
} satisfies DestinationFacts
