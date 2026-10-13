import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "pago-pago",
  "name": "Pago Pago",
  "country": {
    "idISOlower": "as",
    "name": "Samoa (American)"
  },
  "state": {
    "idunique": "as-pago-pago",
    "name": "Pago Pago"
  },
  "timezone": "Pacific/Pago_Pago",
  "centre": {
    "lon": -170.7048298,
    "lat": -14.2754786
  },
  "airport": {
    "id": "pago-pago-airport",
    "name": "Pago Pago International Airport",
    "lon": -170.710007,
    "lat": -14.331,
    "sourceUrl": "https://ourairports.com/airports/NSTU/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/american-oceania-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -170.89036648516475,
    -14.456359489933979,
    -170.51929311483525,
    -14.09459771006602
  ],
  "names": {
    "area": "Pago Pago",
    "unit": "starter play zone",
    "roadHub": "City transit stop (game venue)"
  }
} satisfies DestinationFacts
