import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "port-moresby",
  "name": "Port Moresby",
  "country": {
    "idISOlower": "pg",
    "name": "Papua New Guinea"
  },
  "state": {
    "idunique": "pg",
    "name": "Port Moresby"
  },
  "timezone": "Pacific/Port_Moresby",
  "centre": {
    "lon": 147.1599504,
    "lat": -9.4743301
  },
  "airport": {
    "id": "port-moresby-airport",
    "name": "Port Moresby Jacksons International Airport",
    "lon": 147.22000122070312,
    "lat": -9.443380355834961,
    "sourceUrl": "https://ourairports.com/airports/AYPY/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/papua-new-guinea-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    146.97770666032244,
    -9.655210989933979,
    147.3421941396776,
    -9.29344921006602
  ],
  "names": {
    "area": "Port Moresby",
    "unit": "starter play zone",
    "roadHub": "Boroko"
  }
} satisfies DestinationFacts
