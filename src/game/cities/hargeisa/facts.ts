import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "hargeisa",
  "name": "Hargeisa",
  "country": {
    "idISOlower": "xs",
    "name": "Somaliland"
  },
  "state": {
    "idunique": "xs-hargeisa",
    "name": "Hargeisa"
  },
  "timezone": "Africa/Nairobi",
  "centre": {
    "lon": 44.061803,
    "lat": 9.561733
  },
  "airport": {
    "id": "hargeisa-airport",
    "name": "Egal International Airport",
    "lon": 44.083469,
    "lat": 9.514082,
    "sourceUrl": "https://ourairports.com/airports/HCMH/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/africa/somalia-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    43.87951173893194,
    9.380852110066021,
    44.24409426106806,
    9.74261388993398
  ],
  "names": {
    "area": "Hargeisa",
    "unit": "starter play zone",
    "roadHub": "Harageisa Bus Station"
  }
} satisfies DestinationFacts
