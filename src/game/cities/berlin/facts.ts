import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "berlin",
  "name": "Berlin",
  "country": {
    "idISOlower": "de",
    "name": "Germany"
  },
  "state": {
    "idunique": "de-berlin",
    "name": "Berlin"
  },
  "timezone": "Europe/Berlin",
  "centre": {
    "lon": 13.3951309,
    "lat": 52.5173885
  },
  "airport": {
    "id": "berlin-airport",
    "name": "Berlin Brandenburg Airport",
    "lon": 13.502341,
    "lat": 52.361738,
    "sourceUrl": "https://ourairports.com/airports/EDDB/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/germany/brandenburg-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    13.098664644603774,
    52.33650761006602,
    13.691597155396225,
    52.698269389933984
  ],
  "names": {
    "area": "Berlin",
    "unit": "starter play zone",
    "roadHub": "Tiergarten"
  }
} satisfies DestinationFacts
