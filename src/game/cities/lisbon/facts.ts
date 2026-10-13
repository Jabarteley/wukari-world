import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "lisbon",
  "name": "Lisbon",
  "country": {
    "idISOlower": "pt",
    "name": "Portugal"
  },
  "state": {
    "idunique": "pt-lisbon",
    "name": "Lisbon"
  },
  "timezone": "Europe/Lisbon",
  "centre": {
    "lon": -9.1365919,
    "lat": 38.7077507
  },
  "airport": {
    "id": "lisbon-airport",
    "name": "Lisbon Humberto Delgado Airport",
    "lon": -9.13592,
    "lat": 38.7813,
    "sourceUrl": "https://ourairports.com/airports/LPPT/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/portugal-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -9.36741112308337,
    38.52686981006602,
    -8.905772676916632,
    38.88863158993398
  ],
  "names": {
    "area": "Lisbon",
    "unit": "starter play zone",
    "roadHub": "Praça de Espanha"
  }
} satisfies DestinationFacts
