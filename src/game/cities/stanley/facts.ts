import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "stanley",
  "name": "Stanley",
  "country": {
    "idISOlower": "fk",
    "name": "Falkland Islands"
  },
  "state": {
    "idunique": "fk-stanley",
    "name": "Stanley"
  },
  "timezone": "Atlantic/Stanley",
  "centre": {
    "lon": -57.856525,
    "lat": -51.6930616
  },
  "airport": {
    "id": "stanley-airport",
    "name": "Port Stanley Airport",
    "lon": -57.777599,
    "lat": -51.685699,
    "sourceUrl": "https://ourairports.com/airports/SFAL/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/united-kingdom/falklands-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -58.147526081988616,
    -51.87394248993398,
    -57.56552391801138,
    -51.51218071006602
  ],
  "names": {
    "area": "Stanley",
    "unit": "starter play zone",
    "roadHub": "City transit stop (game venue)"
  }
} satisfies DestinationFacts
