import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "thimphu",
  "name": "Thimphu",
  "country": {
    "idISOlower": "bt",
    "name": "Bhutan"
  },
  "state": {
    "idunique": "bt-thimphu",
    "name": "Thimphu"
  },
  "timezone": "Asia/Thimphu",
  "centre": {
    "lon": 89.6336729,
    "lat": 27.4713546
  },
  "airport": {
    "id": "thimphu-airport",
    "name": "Paro International Airport",
    "lon": 89.424599,
    "lat": 27.4032,
    "sourceUrl": "https://ourairports.com/airports/VQPR/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/bhutan-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    89.41447965842985,
    27.290473710066024,
    89.83650211956622,
    27.65223548993398
  ],
  "names": {
    "area": "Thimphu",
    "unit": "starter play zone",
    "roadHub": "City Bus Terminal"
  }
} satisfies DestinationFacts
