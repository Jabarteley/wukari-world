import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "reykjavik",
  "name": "Reykjavik",
  "country": {
    "idISOlower": "is",
    "name": "Iceland"
  },
  "state": {
    "idunique": "is-reykjavik",
    "name": "Reykjavik"
  },
  "timezone": "Africa/Abidjan",
  "centre": {
    "lon": -21.9422367,
    "lat": 64.145981
  },
  "airport": {
    "id": "reykjavik-airport",
    "name": "Keflavik International Airport",
    "lon": -22.6056,
    "lat": 63.985001,
    "sourceUrl": "https://ourairports.com/airports/BIKF/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/iceland-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -22.626087657575244,
    63.965100110066025,
    -21.527538956024504,
    64.32686188993398
  ],
  "names": {
    "area": "Reykjavik",
    "unit": "starter play zone",
    "roadHub": "Hlemmur mathöll"
  }
} satisfies DestinationFacts
