import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "sarajevo",
  "name": "Sarajevo",
  "country": {
    "idISOlower": "ba",
    "name": "Bosnia & Herzegovina"
  },
  "state": {
    "idunique": "ba-sarajevo",
    "name": "Sarajevo"
  },
  "timezone": "Europe/Belgrade",
  "centre": {
    "lon": 18.4126147,
    "lat": 43.8570713
  },
  "airport": {
    "id": "sarajevo-airport",
    "name": "Sarajevo International Airport",
    "lon": 18.331499,
    "lat": 43.8246,
    "sourceUrl": "https://ourairports.com/airports/LQSA/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/bosnia-herzegovina-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    18.16269488288968,
    43.67619041006602,
    18.662534517110316,
    44.03795218993398
  ],
  "names": {
    "area": "Sarajevo",
    "unit": "starter play zone",
    "roadHub": "Sarajevo"
  }
} satisfies DestinationFacts
