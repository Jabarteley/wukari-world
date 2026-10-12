import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "kinshasa",
  "name": "Kinshasa",
  "country": {
    "idISOlower": "cd",
    "name": "Democratic Republic of the Congo"
  },
  "state": {
    "idunique": "cd",
    "name": "Kinshasa"
  },
  "timezone": "Africa/Kinshasa",
  "centre": {
    "lon": 15.30845475,
    "lat": -4.3063016
  },
  "airport": {
    "id": "kinshasa-airport",
    "name": "Ndjili International Airport",
    "lon": 15.4446,
    "lat": -4.38575,
    "sourceUrl": "https://ourairports.com/airports/FZAA/"
  },
  "sourceLabel": "OpenStreetMap contributors via Geofabrik Democratic Republic of the Congo 2026-10-09 PBF; OurAirports dataset",
  "sourceUrl": "https://download.geofabrik.de/africa/congo-democratic-republic-261009.osm.pbf",
  "licence": "Natural Earth public domain; OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "bounds": [
    15.15,
    -4.55,
    15.6,
    -4.2
  ],
  "coverageNote": "Kinshasa built-up extent from mapped land use, inland water, main roads and named places in the dated Geofabrik DRC PBF. This is not an administrative boundary. The centre is the mapped Town Hall point used as a representative civic-core anchor, not an administrative centroid. Airport coordinates are the OurAirports dataset point, not an official aerodrome reference point or evidence of operations. Visitor services and homes are fictional game content at real named places.",
  "names": {
    "area": "Kinshasa",
    "unit": "district",
    "roadHub": "Kinshasa Est"
  }
} satisfies DestinationFacts
