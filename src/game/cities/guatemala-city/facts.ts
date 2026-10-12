import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "guatemala-city",
  "name": "Guatemala City",
  "country": {
    "idISOlower": "gt",
    "name": "Guatemala"
  },
  "state": {
    "idunique": "gt",
    "name": "Guatemala City"
  },
  "timezone": "America/Guatemala",
  "centre": {
    "lon": -90.5132836,
    "lat": 14.6416142
  },
  "airport": {
    "id": "guatemala-city-airport",
    "name": "La Aurora International Airport",
    "lon": -90.527515,
    "lat": 14.582896,
    "sourceUrl": "https://ourairports.com/airports/MGGT/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america/guatemala-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -90.69913024974917,
    14.46073331006602,
    -90.32743695025081,
    14.822495089933978
  ],
  "names": {
    "area": "Guatemala City",
    "unit": "starter play zone",
    "roadHub": "Platinum Centro Amėrica"
  }
} satisfies DestinationFacts
