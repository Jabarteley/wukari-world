import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "garapan",
  "name": "Garapan",
  "country": {
    "idISOlower": "mp",
    "name": "Northern Mariana Islands"
  },
  "state": {
    "idunique": "mp-garapan",
    "name": "Garapan"
  },
  "timezone": "Pacific/Guam",
  "centre": {
    "lon": 145.7208608,
    "lat": 15.2070851
  },
  "airport": {
    "id": "garapan-airport",
    "name": "Saipan International Airport",
    "lon": 145.728848,
    "lat": 15.119384,
    "sourceUrl": "https://ourairports.com/airports/PGSN/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/american-oceania-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    145.53451840606485,
    15.026204210066021,
    145.90720319393515,
    15.38796598993398
  ],
  "names": {
    "area": "Garapan",
    "unit": "starter play zone",
    "roadHub": "City transit stop (game venue)"
  }
} satisfies DestinationFacts
