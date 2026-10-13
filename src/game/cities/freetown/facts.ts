import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "freetown",
  "name": "Freetown",
  "country": {
    "idISOlower": "sl",
    "name": "Sierra Leone"
  },
  "state": {
    "idunique": "sl-freetown",
    "name": "Freetown"
  },
  "timezone": "Africa/Abidjan",
  "centre": {
    "lon": -13.26795,
    "lat": 8.479004
  },
  "airport": {
    "id": "freetown-airport",
    "name": "Lungi International Airport",
    "lon": -13.1955,
    "lat": 8.61644,
    "sourceUrl": "https://ourairports.com/airports/GFLL/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/africa/sierra-leone-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -13.44968408564828,
    8.29812311006602,
    -13.08621591435172,
    8.659884889933979
  ],
  "names": {
    "area": "Freetown",
    "unit": "starter play zone",
    "roadHub": "Hoverport"
  }
} satisfies DestinationFacts
