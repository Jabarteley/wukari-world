import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "douglas",
  "name": "Douglas",
  "country": {
    "idISOlower": "im",
    "name": "Isle of Man"
  },
  "state": {
    "idunique": "im-douglas",
    "name": "Douglas"
  },
  "timezone": "Europe/London",
  "centre": {
    "lon": -4.4779021,
    "lat": 54.149774
  },
  "airport": {
    "id": "douglas-airport",
    "name": "Isle of Man Airport",
    "lon": -4.623871,
    "lat": 54.083081,
    "sourceUrl": "https://ourairports.com/airports/EGNS/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/isle-of-man-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -4.786014240612886,
    53.96889311006602,
    -4.1697899593871135,
    54.33065488993398
  ],
  "names": {
    "area": "Douglas",
    "unit": "starter play zone",
    "roadHub": "Snaefell Summit"
  }
} satisfies DestinationFacts
