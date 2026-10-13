import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "gustavia",
  "name": "Gustavia",
  "country": {
    "idISOlower": "bl",
    "name": "St Barthelemy"
  },
  "state": {
    "idunique": "bl-gustavia",
    "name": "Gustavia"
  },
  "timezone": "America/Puerto_Rico",
  "centre": {
    "lon": -62.8508372,
    "lat": 17.8957043
  },
  "airport": {
    "id": "gustavia-airport",
    "name": "St. Jean Airport",
    "lon": -62.843333,
    "lat": 17.904398,
    "sourceUrl": "https://ourairports.com/airports/TFFJ/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -63.039827502100195,
    17.71482341006602,
    -62.66184689789981,
    18.076585189933976
  ],
  "names": {
    "area": "Gustavia",
    "unit": "starter play zone",
    "roadHub": "Gustavia Ferry Terminal"
  }
} satisfies DestinationFacts
