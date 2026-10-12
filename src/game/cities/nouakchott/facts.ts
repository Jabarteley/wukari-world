import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "nouakchott",
  "name": "Nouakchott",
  "country": {
    "idISOlower": "mr",
    "name": "Mauritania"
  },
  "state": {
    "idunique": "mr-nouakchott",
    "name": "Nouakchott"
  },
  "timezone": "Africa/Abidjan",
  "centre": {
    "lon": -15.9780071,
    "lat": 18.0792379
  },
  "airport": {
    "id": "nouakchott-airport",
    "name": "Nouakchott–Oumtounsy International Airport",
    "lon": -15.969722,
    "lat": 18.31,
    "sourceUrl": "https://ourairports.com/airports/GQNO/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/africa/mauritania-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -16.167196177109663,
    17.89835701006602,
    -15.788818022890336,
    18.319044044496696
  ],
  "names": {
    "area": "Nouakchott",
    "unit": "starter play zone",
    "roadHub": "Vans to Kiffa"
  }
} satisfies DestinationFacts
