import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "london",
  "name": "London",
  "country": {
    "idISOlower": "gb",
    "name": "Britain (UK)"
  },
  "state": {
    "idunique": "gb-london",
    "name": "London"
  },
  "timezone": "Europe/London",
  "centre": {
    "lon": -0.1277653,
    "lat": 51.5074456
  },
  "airport": {
    "id": "london-airport",
    "name": "London Heathrow Airport",
    "lon": -0.459909,
    "lat": 51.470748,
    "sourceUrl": "https://ourairports.com/airports/EGLL/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/united-kingdom-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -0.4743329676367383,
    51.326564710066016,
    0.16204105356569867,
    51.68832648993398
  ],
  "names": {
    "area": "London",
    "unit": "starter play zone",
    "roadHub": "Walton-on-Thames"
  }
} satisfies DestinationFacts
