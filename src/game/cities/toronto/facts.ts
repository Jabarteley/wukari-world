import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "toronto",
  "name": "Toronto",
  "country": {
    "idISOlower": "ca",
    "name": "Canada"
  },
  "state": {
    "idunique": "ca-toronto",
    "name": "Toronto"
  },
  "timezone": "America/Toronto",
  "centre": {
    "lon": -79.3839347,
    "lat": 43.6534817
  },
  "airport": {
    "id": "toronto-airport",
    "name": "Toronto Pearson International Airport",
    "lon": -79.629421,
    "lat": 43.675935,
    "sourceUrl": "https://ourairports.com/airports/CYYZ/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/north-america/canada/ontario-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -79.64184322710955,
    43.47260081006602,
    -79.13486908374745,
    43.83436258993398
  ],
  "names": {
    "area": "Toronto",
    "unit": "starter play zone",
    "roadHub": "Bay"
  }
} satisfies DestinationFacts
