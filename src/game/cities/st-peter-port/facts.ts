import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "st-peter-port",
  "name": "Saint Peter Port",
  "country": {
    "idISOlower": "gg",
    "name": "Guernsey"
  },
  "state": {
    "idunique": "gg",
    "name": "Saint Peter Port"
  },
  "timezone": "Europe/London",
  "centre": {
    "lon": -2.5389979,
    "lat": 49.4568142
  },
  "airport": {
    "id": "st-peter-port-airport",
    "name": "Guernsey Airport",
    "lon": -2.60197,
    "lat": 49.435001,
    "sourceUrl": "https://ourairports.com/airports/EGJB/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/guernsey-jersey-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -2.816417658416154,
    49.275933310066016,
    -2.261578141583846,
    49.63769508993398
  ],
  "names": {
    "area": "Saint Peter Port",
    "unit": "starter play zone",
    "roadHub": "St Peter Port Harbour"
  }
} satisfies DestinationFacts
