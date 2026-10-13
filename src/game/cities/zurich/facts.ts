import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "zurich",
  "name": "Zurich",
  "country": {
    "idISOlower": "ch",
    "name": "Switzerland"
  },
  "state": {
    "idunique": "ch-zurich",
    "name": "Zurich"
  },
  "timezone": "Europe/Zurich",
  "centre": {
    "lon": 8.5410422,
    "lat": 47.3744489
  },
  "airport": {
    "id": "zurich-airport",
    "name": "Zürich Airport",
    "lon": 8.548056,
    "lat": 47.458056,
    "sourceUrl": "https://ourairports.com/airports/LSZH/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/switzerland-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    8.274827776048742,
    47.193568010066016,
    8.807256623951258,
    47.55532978993398
  ],
  "names": {
    "area": "Zurich",
    "unit": "starter play zone",
    "roadHub": "Dietikon"
  }
} satisfies DestinationFacts
