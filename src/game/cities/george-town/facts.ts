import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "george-town",
  "name": "George Town",
  "country": {
    "idISOlower": "ky",
    "name": "Cayman Islands"
  },
  "state": {
    "idunique": "ky-george-town",
    "name": "George Town"
  },
  "timezone": "America/Panama",
  "centre": {
    "lon": -81.3807776,
    "lat": 19.2953549
  },
  "airport": {
    "id": "george-town-airport",
    "name": "Owen Roberts International Airport",
    "lon": -81.357697,
    "lat": 19.292801,
    "sourceUrl": "https://ourairports.com/airports/MWCR/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -81.57134407520206,
    19.114474010066022,
    -81.19021112479794,
    19.476235789933977
  ],
  "names": {
    "area": "George Town",
    "unit": "starter play zone",
    "roadHub": "Royal Watler Cruise Terminal"
  }
} satisfies DestinationFacts
