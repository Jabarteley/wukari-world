import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "grytviken",
  "name": "Grytviken",
  "country": {
    "idISOlower": "gs",
    "name": "South Georgia & the South Sandwich Islands"
  },
  "state": {
    "idunique": "gs",
    "name": "Grytviken"
  },
  "timezone": "Atlantic/South_Georgia",
  "centre": {
    "lon": -36.5098,
    "lat": -54.2806481
  },
  "airport": {
    "id": "grytviken-airport",
    "name": "Grytviken Emergency Helipad",
    "lon": -36.5095,
    "lat": -54.2824,
    "sourceUrl": "https://ourairports.com/airports/GS-0001/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://github.com/kromate/joinallworld/releases/download/extracts-20261014/osmfr-south-georgia-261013.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -36.5868190710594,
    -54.325868322483494,
    -36.432780928940595,
    -54.23542787751651
  ],
  "generatedLinkPolicy": "authored-only",
  "links": [
    {
      "to": "buenos-aires",
      "name": "Buenos Aires",
      "kind": "ship",
      "km": 2769
    },
    {
      "to": "cape-town",
      "name": "Cape Town",
      "kind": "ship",
      "km": 4782
    }
  ],
  "names": {
    "area": "Grytviken",
    "unit": "starter play zone",
    "roadHub": "City transit stop (game venue)"
  }
} satisfies DestinationFacts
