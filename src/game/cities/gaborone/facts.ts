import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "gaborone",
  "name": "Gaborone",
  "country": { "idISOlower": "bw", "name": "Botswana" },
  "state": { "idunique": "bw-gaborone", "name": "Gaborone" },
  "timezone": "Africa/Gaborone",
  "centre": { "lon": 25.9088474, "lat": -24.6581357 },
  "airport": {
    "id": "gaborone-airport",
    "name": "Sir Seretse Khama International Airport",
    "lon": 25.9182,
    "lat": -24.555201,
    "sourceUrl": "https://ourairports.com/airports/FBSK/"
  },
  "sourceLabel": "OpenStreetMap contributors via the Overpass interpreter and OurAirports dataset",
  "sourceUrl": "https://www.openstreetmap.org/copyright",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "bounds": [-24.76, 25.78, -24.52, 26.03],
  "coverageNote": "Gaborone from the mapped built-up land around the city centre and its surrounding neighbourhoods: a sketch of the built-up extent traced from mapped land use, mapped inland water, main roads and named places from OpenStreetMap. The airport point is a published OurAirports dataset point, not an official aviation reference point or evidence of current schedules. Visitor services and homes are fictional game content set at the real named places.",
  "names": { "area": "Gaborone", "unit": "district", "roadHub": "Gaborone" }
} satisfies DestinationFacts
