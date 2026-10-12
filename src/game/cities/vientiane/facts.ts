import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "vientiane",
  "name": "Vientiane",
  "country": {
    "idISOlower": "la",
    "name": "Laos"
  },
  "state": {
    "idunique": "la-vientiane",
    "name": "Vientiane"
  },
  "timezone": "Asia/Bangkok",
  "centre": {
    "lon": 102.6133707,
    "lat": 17.9640988
  },
  "airport": {
    "id": "vientiane-airport",
    "name": "Wattay International Airport",
    "lon": 102.566692,
    "lat": 17.985052,
    "sourceUrl": "https://ourairports.com/airports/VLVT/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/laos-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    102.42430659921996,
    17.78321791006602,
    102.80243480078005,
    18.144979689933976
  ],
  "names": {
    "area": "Vientiane",
    "unit": "starter play zone",
    "roadHub": "Vientiane"
  }
} satisfies DestinationFacts
