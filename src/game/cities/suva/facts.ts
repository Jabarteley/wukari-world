import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "suva",
  "name": "Suva",
  "country": {
    "idISOlower": "fj",
    "name": "Fiji"
  },
  "state": {
    "idunique": "fj-suva",
    "name": "Suva"
  },
  "timezone": "Pacific/Fiji",
  "centre": {
    "lon": 178.4421662,
    "lat": -18.1415884
  },
  "airport": {
    "id": "suva-airport",
    "name": "Nausori International Airport",
    "lon": 178.561486,
    "lat": -18.044226,
    "sourceUrl": "https://ourairports.com/airports/NFNA/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/fiji-261009.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    178.25290905716855,
    -18.322469289933977,
    178.63142334283145,
    -17.960707510066023
  ],
  "names": {
    "area": "Suva",
    "unit": "starter play zone",
    "roadHub": "Narain Jetty"
  }
} satisfies DestinationFacts
