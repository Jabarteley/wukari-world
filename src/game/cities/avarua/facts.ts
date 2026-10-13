import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "avarua",
  "name": "Avarua",
  "country": {
    "idISOlower": "ck",
    "name": "Cook Islands"
  },
  "state": {
    "idunique": "ck-avarua",
    "name": "Avarua"
  },
  "timezone": "Pacific/Rarotonga",
  "centre": {
    "lon": -159.7708145,
    "lat": -21.2074736
  },
  "airport": {
    "id": "avarua-airport",
    "name": "Rarotonga International Airport",
    "lon": -159.806,
    "lat": -21.2027,
    "sourceUrl": "https://ourairports.com/airports/NCRG/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/cook-islands-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -159.96376526193234,
    -21.388354489933977,
    -159.57786373806766,
    -21.026592710066023
  ],
  "names": {
    "area": "Avarua",
    "unit": "starter play zone",
    "roadHub": "Cook's Corner Bus Terminal"
  }
} satisfies DestinationFacts
