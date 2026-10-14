import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "mata-utu",
  "name": "Mata Utu",
  "country": {
    "idISOlower": "wf",
    "name": "Wallis & Futuna"
  },
  "state": {
    "idunique": "wf-mata-utu",
    "name": "Mata Utu"
  },
  "timezone": "Pacific/Tarawa",
  "centre": {
    "lon": -176.1740224,
    "lat": -13.2820419
  },
  "airport": {
    "id": "mata-utu-airport",
    "name": "Hihifo Airport",
    "lon": -176.19865,
    "lat": -13.239445,
    "sourceUrl": "https://ourairports.com/airports/NLWW/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/wallis-et-futuna-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -176.35876110994698,
    -13.462922789933979,
    -175.98928369005304,
    -13.10116101006602
  ],
  "names": {
    "area": "Mata Utu",
    "unit": "starter play zone",
    "roadHub": "City transit stop (game venue)"
  }
} satisfies DestinationFacts
