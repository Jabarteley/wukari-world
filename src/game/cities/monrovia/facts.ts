import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "monrovia",
  "name": "Monrovia",
  "country": {
    "idISOlower": "lr",
    "name": "Liberia"
  },
  "state": {
    "idunique": "lr-montserrado",
    "name": "Montserrado County"
  },
  "timezone": "Africa/Monrovia",
  "centre": {
    "lon": -10.8,
    "lat": 6.31
  },
  "airport": {
    "id": "monrovia-airport",
    "name": "Spriggs Payne Airport",
    "lon": -10.7587,
    "lat": 6.28906,
    "sourceUrl": "https://ourairports.com/airports/GLMR/"
  },
  "sourceLabel": "OpenStreetMap contributors and OurAirports dataset",
  "sourceUrl": "https://www.openstreetmap.org/copyright",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "bounds": [
    -10.92,
    6.21,
    -10.68,
    6.41
  ],
  "coverageNote": "Monrovia: a sketch of the mapped built-up extent from the Atlantic coastline east through Paynesville, with mapped rivers, lakes, reservoirs and lagoon, roads and named OpenStreetMap places. The play bounds retain Spriggs Payne Airport (MLW/GLMR); its location is an OurAirports dataset point, not an official reference point or evidence of current operations or schedules. The supplied source records contain no wetland-tagged polygons. Visitor services and homes are fictional game content set at real named places.",
  "names": {
    "area": "Monrovia",
    "unit": "district",
    "roadHub": "Red Light Motorpark"
  }
} satisfies DestinationFacts
