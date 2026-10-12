import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "dili",
  "name": "Dili",
  "country": {
    "idISOlower": "tl",
    "name": "East Timor"
  },
  "state": {
    "idunique": "tl-dili",
    "name": "Dili"
  },
  "timezone": "Asia/Dili",
  "centre": {
    "lon": 125.5784093,
    "lat": -8.5536809
  },
  "airport": {
    "id": "dili-airport",
    "name": "Presidente Nicolau Lobato International Airport",
    "lon": 125.524507,
    "lat": -8.546562,
    "sourceUrl": "https://ourairports.com/airports/WPDL/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/east-timor-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    125.39663897711469,
    -8.734561789933979,
    125.76017962288532,
    -8.37280001006602
  ],
  "names": {
    "area": "Dili",
    "unit": "starter play zone",
    "roadHub": "Porto de Dili"
  }
} satisfies DestinationFacts
