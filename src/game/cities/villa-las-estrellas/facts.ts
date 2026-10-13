import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "villa-las-estrellas",
  "name": "Villa Las Estrellas",
  "country": {
    "idISOlower": "aq",
    "name": "Antarctica"
  },
  "state": {
    "idunique": "aq",
    "name": "Villa Las Estrellas"
  },
  "timezone": "Antarctica/Palmer",
  "centre": {
    "lon": -58.965369,
    "lat": -62.2004259
  },
  "airport": {
    "id": "villa-las-estrellas-airport",
    "name": "Teniente Rodolfo Marsh Martin Airport",
    "lon": -58.98669,
    "lat": -62.191026,
    "sourceUrl": "https://ourairports.com/airports/SCRM/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/antarctica-261013.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -59.35291859748897,
    -62.38130678993398,
    -58.57781940251103,
    -62.01954501006602
  ],
  "generatedLinkPolicy": "authored-only",
  "links": [
    {
      "to": "santiago",
      "name": "Santiago",
      "kind": "charter",
      "km": 3303
    },
    {
      "to": "buenos-aires",
      "name": "Buenos Aires",
      "kind": "ship",
      "km": 3068
    }
  ],
  "names": {
    "area": "Villa Las Estrellas",
    "unit": "starter play zone",
    "roadHub": "City transit stop (game venue)"
  }
} satisfies DestinationFacts
