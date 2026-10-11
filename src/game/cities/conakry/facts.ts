import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "conakry",
  "name": "Conakry",
  "country": {
    "idISOlower": "gn",
    "name": "Guinea"
  },
  "state": {
    "idunique": "gn-conakry",
    "name": "Conakry"
  },
  "timezone": "Africa/Conakry",
  "centre": {
    "lon": -13.677,
    "lat": 9.555
  },
  "airport": {
    "id": "conakry-airport",
    "name": "Ahmed Sékou Touré International Airport",
    "lon": -13.612,
    "lat": 9.57689,
    "sourceUrl": "https://ourairports.com/airports/GUCY/"
  },
  "sourceLabel": "OpenStreetMap contributors and OurAirports dataset",
  "sourceUrl": "https://www.openstreetmap.org/copyright",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "bounds": [
    -13.8,
    9.43,
    -13.56,
    9.63
  ],
  "coverageNote": "Conakry: a sketch of mapped built-up land, the Atlantic coastal water band, main roads and named OpenStreetMap places. The arrival point is the OurAirports CKY/GUCY dataset coordinate, not an official reference point or evidence of current operations or schedules. Visitor services, voting and homes are fictional game content set at real named places.",
  "names": {
    "area": "Conakry",
    "unit": "district",
    "roadHub": "Gare Routière de Matam"
  }
} satisfies DestinationFacts
