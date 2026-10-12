import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "nukualofa",
  "name": "Nuku'alofa",
  "country": {
    "idISOlower": "to",
    "name": "Tonga"
  },
  "state": {
    "idunique": "to-nukualofa",
    "name": "Nuku'alofa"
  },
  "timezone": "Pacific/Tongatapu",
  "centre": {
    "lon": -175.201808,
    "lat": -21.1343401
  },
  "airport": {
    "id": "nukualofa-airport",
    "name": "Fua'amotu International Airport",
    "lon": -175.149164,
    "lat": -21.241438,
    "sourceUrl": "https://ourairports.com/airports/NFTF/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/tonga-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -175.39466250638603,
    -21.315220989933977,
    -175.00895349361397,
    -20.953459210066022
  ],
  "names": {
    "area": "Nuku'alofa",
    "unit": "starter play zone",
    "roadHub": "Ferry to Islands"
  }
} satisfies DestinationFacts
