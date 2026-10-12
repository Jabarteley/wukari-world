import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "podgorica",
  "name": "Podgorica",
  "country": {
    "idISOlower": "me",
    "name": "Montenegro"
  },
  "state": {
    "idunique": "me-podgorica",
    "name": "Podgorica"
  },
  "timezone": "Europe/Belgrade",
  "centre": {
    "lon": 19.2621081,
    "lat": 42.4415238
  },
  "airport": {
    "id": "podgorica-airport",
    "name": "Podgorica Airport / Podgorica Golubovci Airbase",
    "lon": 19.2519,
    "lat": 42.359402,
    "sourceUrl": "https://ourairports.com/airports/LYPG/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/montenegro-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    19.017946185363805,
    42.26064291006602,
    19.506270014636193,
    42.62240468993398
  ],
  "names": {
    "area": "Podgorica",
    "unit": "starter play zone",
    "roadHub": "Bioče"
  }
} satisfies DestinationFacts
