import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "kingston-nf",
  "name": "Kingston",
  "country": {
    "idISOlower": "nf",
    "name": "Norfolk Island"
  },
  "state": {
    "idunique": "nf-kingston-nf",
    "name": "Kingston"
  },
  "timezone": "Pacific/Norfolk",
  "centre": {
    "lon": 167.9595733,
    "lat": -29.0563564
  },
  "airport": {
    "id": "kingston-nf-airport",
    "name": "Norfolk Island International Airport",
    "lon": 167.939474,
    "lat": -29.041759,
    "sourceUrl": "https://ourairports.com/airports/YSNF/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/australia/norfolk-island-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    167.75368143514592,
    -29.237237289933976,
    168.16546516485406,
    -28.87547551006602
  ],
  "names": {
    "area": "Kingston",
    "unit": "starter play zone",
    "roadHub": "City transit stop (game venue)"
  }
} satisfies DestinationFacts
