import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "santo-domingo",
  "name": "Santo Domingo",
  "country": {
    "idISOlower": "do",
    "name": "Dominican Republic"
  },
  "state": {
    "idunique": "do",
    "name": "Santo Domingo"
  },
  "timezone": "America/Santo_Domingo",
  "centre": {
    "lon": -69.8918436,
    "lat": 18.4713858
  },
  "airport": {
    "id": "santo-domingo-airport",
    "name": "Las Américas International Airport",
    "lon": -69.668899536133,
    "lat": 18.42970085144,
    "sourceUrl": "https://ourairports.com/airports/MDSD/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america/haiti-and-domrep-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -70.08146532695397,
    18.290504910066023,
    -69.65943029578544,
    18.652266689933978
  ],
  "names": {
    "area": "Santo Domingo",
    "unit": "starter play zone",
    "roadHub": "Amín Abel Hasbún"
  }
} satisfies DestinationFacts
