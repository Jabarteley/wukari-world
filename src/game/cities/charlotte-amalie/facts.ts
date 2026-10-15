import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "charlotte-amalie",
  "name": "Charlotte Amalie",
  "country": {
    "idISOlower": "vi",
    "name": "Virgin Islands (US)"
  },
  "state": {
    "idunique": "vi",
    "name": "Charlotte Amalie"
  },
  "timezone": "America/Puerto_Rico",
  "centre": {
    "lon": -64.9335173,
    "lat": 18.3414575
  },
  "airport": {
    "id": "charlotte-amalie-airport",
    "name": "Cyril E. King Airport",
    "lon": -64.977251,
    "lat": 18.337091,
    "sourceUrl": "https://ourairports.com/airports/TIST/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/north-america/us/us-virgin-islands-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -65.12299447684404,
    18.160576610066023,
    -64.76300586691484,
    18.522338389933978
  ],
  "names": {
    "area": "Charlotte Amalie",
    "unit": "starter play zone",
    "roadHub": "Frenchman’s Cove"
  }
} satisfies DestinationFacts
