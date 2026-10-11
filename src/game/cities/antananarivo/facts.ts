import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "antananarivo",
  "name": "Antananarivo",
  "country": {
    "idISOlower": "mg",
    "name": "Madagascar"
  },
  "state": {
    "idunique": "mg-t",
    "name": "Analamanga"
  },
  "timezone": "Indian/Antananarivo",
  "centre": {
    "lon": 47.5255809,
    "lat": -18.9100122
  },
  "airport": {
    "id": "FMMI",
    "name": "Ivato International Airport",
    "lon": 47.478802,
    "lat": -18.7969,
    "sourceUrl": "https://ourairports.com/airports/FMMI/"
  },
  "sourceLabel": "Natural Earth, OpenStreetMap contributors and OurAirports dataset",
  "sourceUrl": "https://download.geofabrik.de/africa/madagascar-261009.osm.pbf",
  "licence": "Natural Earth public domain; OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "bounds": [
    47.39,
    -19.01,
    47.63,
    -18.76
  ],
  "coverageNote": "A broad play area from the mapped suburbs west of Ivato through central Antananarivo and south toward Mandroseza: a sketch of the built-up extent traced from mapped land use (not an administrative boundary), water bodies mapped as lakes, marshes and river banks, primary roads and named places from a dated OpenStreetMap country extract. The airport point is from the OurAirports dataset, not an official reference point or evidence of current operations or schedules. Visitor services and homes are fictional game content set at real named places.",
  "names": {
    "area": "Antananarivo",
    "unit": "neighbourhood",
    "roadHub": "Soarano"
  }
} satisfies DestinationFacts
