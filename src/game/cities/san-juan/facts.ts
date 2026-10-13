import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "san-juan",
  "name": "San Juan",
  "country": {
    "idISOlower": "pr",
    "name": "Puerto Rico"
  },
  "state": {
    "idunique": "pr-san-juan",
    "name": "San Juan"
  },
  "timezone": "America/Puerto_Rico",
  "centre": {
    "lon": -66.116666,
    "lat": 18.465299
  },
  "airport": {
    "id": "san-juan-airport",
    "name": "Luis Munoz Marin International Airport",
    "lon": -66.001801,
    "lat": 18.4394,
    "sourceUrl": "https://ourairports.com/airports/TJSJ/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/north-america/us/puerto-rico-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -66.30628092846186,
    18.284418110066024,
    -65.92705107153813,
    18.64617988993398
  ],
  "names": {
    "area": "San Juan",
    "unit": "starter play zone",
    "roadHub": "Hato Rey"
  }
} satisfies DestinationFacts
