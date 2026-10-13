import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "conakry",
  "name": "Conakry",
  "country": {
    "idISOlower": "gn",
    "name": "Guinea"
  },
  "state": {
    "idunique": "gn-conakry",
    "name": "Conakry"
  },
  "timezone": "Africa/Abidjan",
  "centre": {
    "lon": -13.6998434,
    "lat": 9.5170602
  },
  "airport": {
    "id": "conakry-airport",
    "name": "Ahmed Sékou Touré International Airport",
    "lon": -13.612,
    "lat": 9.57689,
    "sourceUrl": "https://ourairports.com/airports/GUCY/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/africa/guinea-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -13.882110316157231,
    9.33617931006602,
    -13.51757648384277,
    9.697941089933979
  ],
  "names": {
    "area": "Conakry",
    "unit": "starter play zone",
    "roadHub": "Simbaya"
  }
} satisfies DestinationFacts
