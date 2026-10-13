import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "belize-city",
  "name": "Belize City",
  "country": {
    "idISOlower": "bz",
    "name": "Belize"
  },
  "state": {
    "idunique": "bz-belize-city",
    "name": "Belize City"
  },
  "timezone": "America/Belize",
  "centre": {
    "lon": -88.1988737,
    "lat": 17.5002768
  },
  "airport": {
    "id": "belize-city-airport",
    "name": "Philip S. W. Goldson International Airport",
    "lon": -88.303556,
    "lat": 17.539951,
    "sourceUrl": "https://ourairports.com/airports/MZBZ/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america/belize-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -88.38744371588106,
    17.319395910066024,
    -88.01030368411892,
    17.68115768993398
  ],
  "names": {
    "area": "Belize City",
    "unit": "starter play zone",
    "roadHub": "Belize City => Corozal Town"
  }
} satisfies DestinationFacts
