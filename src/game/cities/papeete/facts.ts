import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "papeete",
  "name": "Papeete",
  "country": {
    "idISOlower": "pf",
    "name": "French Polynesia"
  },
  "state": {
    "idunique": "pf-papeete",
    "name": "Papeete"
  },
  "timezone": "Pacific/Tahiti",
  "centre": {
    "lon": -149.5659964,
    "lat": -17.5373835
  },
  "airport": {
    "id": "papeete-airport",
    "name": "Fa'a'ā International Airport",
    "lon": -149.606936,
    "lat": -17.553472,
    "sourceUrl": "https://ourairports.com/airports/NTAA/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/polynesie-francaise-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -149.7546053940901,
    -17.718264389933978,
    -149.37738740590987,
    -17.356502610066023
  ],
  "names": {
    "area": "Papeete",
    "unit": "starter play zone",
    "roadHub": "Gare Maritime"
  }
} satisfies DestinationFacts
