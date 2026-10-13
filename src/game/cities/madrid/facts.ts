import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "madrid",
  "name": "Madrid",
  "country": {
    "idISOlower": "es",
    "name": "Spain"
  },
  "state": {
    "idunique": "es-madrid",
    "name": "Madrid"
  },
  "timezone": "Europe/Madrid",
  "centre": {
    "lon": -3.703507,
    "lat": 40.416782
  },
  "airport": {
    "id": "madrid-airport",
    "name": "Adolfo Suárez Madrid–Barajas Airport",
    "lon": -3.572249,
    "lat": 40.493407,
    "sourceUrl": "https://ourairports.com/airports/LEMD/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/spain-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -3.940123282444742,
    40.23590111006602,
    -3.466890717555258,
    40.59766288993398
  ],
  "names": {
    "area": "Madrid",
    "unit": "starter play zone",
    "roadHub": "Fuencarral"
  }
} satisfies DestinationFacts
