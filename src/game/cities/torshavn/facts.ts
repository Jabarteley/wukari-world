import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "torshavn",
  "name": "Tórshavn",
  "country": {
    "idISOlower": "fo",
    "name": "Faroe Islands"
  },
  "state": {
    "idunique": "fo-torshavn",
    "name": "Tórshavn"
  },
  "timezone": "Atlantic/Faroe",
  "centre": {
    "lon": -6.7715709,
    "lat": 62.0101396
  },
  "airport": {
    "id": "torshavn-airport",
    "name": "Vágar Airport",
    "lon": -7.275782,
    "lat": 62.063256,
    "sourceUrl": "https://ourairports.com/airports/EKVG/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/faroe-islands-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -7.294962051435183,
    61.82925871006602,
    -6.386463709992522,
    62.19102048993398
  ],
  "names": {
    "area": "Tórshavn",
    "unit": "starter play zone",
    "roadHub": "M/F Teistin"
  }
} satisfies DestinationFacts
