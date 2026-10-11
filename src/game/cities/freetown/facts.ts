import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "freetown",
  "name": "Freetown",
  "country": {
    "idISOlower": "sl",
    "name": "Sierra Leone"
  },
  "state": {
    "idunique": "sl-western-area",
    "name": "Western Area"
  },
  "timezone": "Africa/Freetown",
  "centre": {
    "lon": -13.24,
    "lat": 8.47
  },
  "airport": {
    "id": "freetown-airport",
    "name": "Lungi International Airport",
    "lon": -13.1955,
    "lat": 8.61644,
    "sourceUrl": "https://ourairports.com/airports/GFLL/"
  },
  "sourceLabel": "OpenStreetMap contributors and OurAirports dataset",
  "sourceUrl": "https://www.openstreetmap.org/copyright",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "bounds": [
    -13.36,
    8.37,
    -13.12,
    8.65
  ],
  "coverageNote": "Freetown and the Lungi arrival area: built-up land traced from mapped land use, the real Sierra Leone River estuary and Atlantic coastline, mapped roads and named places in OpenStreetMap. The airport is across the estuary. The game travel action does not model a ferry timetable or a navigable ferry route; there is no invented bridge. Airport coordinates are an OurAirports dataset point, not an official reference point or evidence of current operations or schedules. Visitor activities and homes are fictional game content at real mapped places.",
  "names": {
    "area": "Freetown",
    "unit": "district",
    "roadHub": "Mini Bus Terminal Shell"
  }
} satisfies DestinationFacts
