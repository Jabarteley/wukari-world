import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "mexico-city",
  "name": "Mexico City",
  "country": {
    "idISOlower": "mx",
    "name": "Mexico"
  },
  "state": {
    "idunique": "mx-mexico-city",
    "name": "Mexico City"
  },
  "timezone": "America/Mexico_City",
  "centre": {
    "lon": -99.1331785,
    "lat": 19.4326296
  },
  "airport": {
    "id": "mexico-city-airport",
    "name": "Mexico City Benito Juárez International Airport",
    "lon": -99.07033,
    "lat": 19.435822,
    "sourceUrl": "https://ourairports.com/airports/MMMX/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/north-america/mexico-261009.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -99.32390712929879,
    19.25174871006602,
    -98.94244987070121,
    19.613510489933976
  ],
  "names": {
    "area": "Mexico City",
    "unit": "starter play zone",
    "roadHub": "General Anaya"
  }
} satisfies DestinationFacts
