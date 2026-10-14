import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "siachen",
  "name": "Terong Kangri",
  "country": {
    "idISOlower": "xg",
    "name": "Siachen Glacier"
  },
  "state": {
    "idunique": "xg-siachen",
    "name": "Terong Kangri"
  },
  "timezone": "Etc/GMT-5",
  "centre": {
    "lon": 77.3141384,
    "lat": 35.3986779
  },
  "airport": {
    "id": "siachen-airport",
    "name": "Col D'Italia",
    "lon": 77.3191797,
    "lat": 35.4672365,
    "sourceUrl": "https://www.openstreetmap.org/node/3533480355"
  },
  "sourceLabel": "OpenStreetMap country PBF",
  "sourceUrl": "https://download.geofabrik.de/asia/india/northern-zone-261013.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0",
  "coverageNote": "Source-sampling bounds from a mapped place node and its mapped gateway node; the grouping is not an administrative-boundary claim. A mapped landing, heliport or track does not establish current operations or access.",
  "gateway": {
    "mode": "land",
    "osmRef": "node/3533480355"
  },
  "bounds": [
    77.22589663014551,
    35.32632554402641,
    77.4023801698545,
    35.476280544496696
  ],
  "generatedLinkPolicy": "authored-only",
  "links": [
    {
      "to": "delhi",
      "name": "Delhi",
      "kind": "overland",
      "km": 749
    },
    {
      "to": "lahore",
      "name": "Lahore",
      "kind": "overland",
      "km": 509
    }
  ],
  "names": {
    "area": "Terong Kangri",
    "unit": "starter play zone",
    "roadHub": "City transit stop (game venue)"
  }
} satisfies DestinationFacts
