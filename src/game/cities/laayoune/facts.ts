import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "laayoune",
  "name": "Laayoune",
  "country": {
    "idISOlower": "eh",
    "name": "Western Sahara"
  },
  "state": {
    "idunique": "eh-laayoune",
    "name": "Laayoune"
  },
  "timezone": "Africa/El_Aaiun",
  "centre": {
    "lon": -13.1953921,
    "lat": 27.154512
  },
  "airport": {
    "id": "laayoune-airport",
    "name": "Laayoune Hassan I International Airport",
    "lon": -13.224947,
    "lat": 27.142467,
    "sourceUrl": "https://ourairports.com/airports/GMML/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/africa/morocco-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -13.39763842466019,
    26.973631110066023,
    -12.993145775339809,
    27.335392889933978
  ],
  "names": {
    "area": "Laayoune",
    "unit": "starter play zone",
    "roadHub": "Gare routier"
  }
} satisfies DestinationFacts
