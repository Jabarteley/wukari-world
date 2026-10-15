import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "road-town",
  "name": "Road Town",
  "country": {
    "idISOlower": "vg",
    "name": "Virgin Islands (UK)"
  },
  "state": {
    "idunique": "vg-road-town",
    "name": "Road Town"
  },
  "timezone": "America/Puerto_Rico",
  "centre": {
    "lon": -64.6230914,
    "lat": 18.425766
  },
  "airport": {
    "id": "road-town-airport",
    "name": "Terrance B. Lettsome International Airport",
    "lon": -64.541707,
    "lat": 18.445492,
    "sourceUrl": "https://ourairports.com/airports/TUPJ/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -64.76295577820954,
    18.244885110066022,
    -64.43352056296249,
    18.606646889933977
  ],
  "names": {
    "area": "Road Town",
    "unit": "starter play zone",
    "roadHub": "Great Harbour Ferry Dock"
  }
} satisfies DestinationFacts
