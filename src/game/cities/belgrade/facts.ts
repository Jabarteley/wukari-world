import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "belgrade",
  "name": "Belgrade",
  "country": {
    "idISOlower": "rs",
    "name": "Serbia"
  },
  "state": {
    "idunique": "rs-belgrade",
    "name": "Belgrade"
  },
  "timezone": "Europe/Belgrade",
  "centre": {
    "lon": 20.4568974,
    "lat": 44.8178131
  },
  "airport": {
    "id": "belgrade-airport",
    "name": "Belgrade Nikola Tesla Airport",
    "lon": 20.309099,
    "lat": 44.818401,
    "sourceUrl": "https://ourairports.com/airports/LYBE/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/serbia-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    20.202822421982965,
    44.63693221006602,
    20.710972378017033,
    44.99869398993398
  ],
  "names": {
    "area": "Belgrade",
    "unit": "starter play zone",
    "roadHub": "Ripanj"
  }
} satisfies DestinationFacts
