import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "mbabane",
  "name": "Mbabane",
  "country": {
    "idISOlower": "sz",
    "name": "Eswatini"
  },
  "state": {
    "idunique": "sz-hhohho",
    "name": "Hhohho"
  },
  "timezone": "Africa/Mbabane",
  "centre": {
    "lon": 31.144663,
    "lat": -26.325745
  },
  "airport": {
    "id": "mbabane-airport",
    "name": "King Mswati III International Airport",
    "lon": 31.716944,
    "lat": -26.358611,
    "sourceUrl": "https://ourairports.com/airports/FDSK/"
  },
  "sourceLabel": "OpenStreetMap contributors and OurAirports dataset",
  "sourceUrl": "https://www.openstreetmap.org/copyright",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "bounds": [
    31.02,
    -26.43,
    31.75,
    -26.22
  ],
  "coverageNote": "Mbabane: a sketch of the mapped built-up extent from Eswatini PBF land use, mapped inland water, roads and named OpenStreetMap places. The play bounds retain the distant FDSK airport; its published OurAirports point is not an official reference point or evidence of current operations or schedules. Visitor services and homes are fictional game content set at real named places.",
  "names": {
    "area": "Mbabane",
    "unit": "district",
    "roadHub": "Mbabane Bus Rank"
  }
} satisfies DestinationFacts
