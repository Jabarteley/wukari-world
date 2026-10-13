import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "funafuti",
  "name": "Funafuti",
  "country": {
    "idISOlower": "tv",
    "name": "Tuvalu"
  },
  "state": {
    "idunique": "tv-funafuti",
    "name": "Funafuti"
  },
  "timezone": "Pacific/Tarawa",
  "centre": {
    "lon": 179.1982548,
    "lat": -8.5199633
  },
  "airport": {
    "id": "funafuti-airport",
    "name": "Funafuti International Airport",
    "lon": 179.196976,
    "lat": -8.523885,
    "sourceUrl": "https://ourairports.com/airports/NGFU/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/tuvalu-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    179.01650087872326,
    -8.70084418993398,
    179.38000872127674,
    -8.339082410066021
  ],
  "names": {
    "area": "Funafuti",
    "unit": "starter play zone",
    "roadHub": "City transit stop (game venue)"
  }
} satisfies DestinationFacts
