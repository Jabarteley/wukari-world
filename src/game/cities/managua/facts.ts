import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "managua",
  "name": "Managua",
  "country": {
    "idISOlower": "ni",
    "name": "Nicaragua"
  },
  "state": {
    "idunique": "ni-managua",
    "name": "Managua"
  },
  "timezone": "America/Managua",
  "centre": {
    "lon": -86.273725,
    "lat": 12.1547116
  },
  "airport": {
    "id": "managua-airport",
    "name": "Augusto C. Sandino (Managua) International Airport",
    "lon": -86.168198,
    "lat": 12.1415,
    "sourceUrl": "https://ourairports.com/airports/MNMG/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america/nicaragua-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -86.45763311236715,
    11.973830710066022,
    -86.08981688763285,
    12.33559248993398
  ],
  "names": {
    "area": "Managua",
    "unit": "starter play zone",
    "roadHub": "TICABUS Central Managua."
  }
} satisfies DestinationFacts
