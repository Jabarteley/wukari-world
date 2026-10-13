import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "brussels",
  "name": "Brussels",
  "country": {
    "idISOlower": "be",
    "name": "Belgium"
  },
  "state": {
    "idunique": "be-brussels",
    "name": "Brussels"
  },
  "timezone": "Europe/Brussels",
  "centre": {
    "lon": 4.352493,
    "lat": 50.8467372
  },
  "airport": {
    "id": "brussels-airport",
    "name": "Brussels Airport",
    "lon": 4.48444,
    "lat": 50.901402,
    "sourceUrl": "https://ourairports.com/airports/EBBR/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/belgium-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    4.066836811706027,
    50.66585631006602,
    4.638149188293973,
    51.02761808993398
  ],
  "names": {
    "area": "Brussels",
    "unit": "starter play zone",
    "roadHub": "Brussels-Midi"
  }
} satisfies DestinationFacts
