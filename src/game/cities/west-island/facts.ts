import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "west-island",
  "name": "West Island",
  "country": {
    "idISOlower": "cc",
    "name": "Cocos (Keeling) Islands"
  },
  "state": {
    "idunique": "cc",
    "name": "West Island"
  },
  "timezone": "Asia/Yangon",
  "centre": {
    "lon": 96.8304486,
    "lat": -12.1898479
  },
  "airport": {
    "id": "west-island-airport",
    "name": "Cocos (Keeling) Islands Airport",
    "lon": 96.834103,
    "lat": -12.192218,
    "sourceUrl": "https://ourairports.com/airports/YPCC/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/australia/cocos-islands-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    96.64651578619483,
    -12.37072878993398,
    97.01438141380517,
    -12.008967010066021
  ],
  "generatedLinkPolicy": "authored-only",
  "links": [
    {
      "to": "flying-fish-cove",
      "name": "Flying Fish Cove",
      "kind": "charter",
      "km": 984
    },
    {
      "to": "jakarta",
      "name": "Jakarta",
      "kind": "ship",
      "km": 1285
    }
  ],
  "names": {
    "area": "West Island",
    "unit": "starter play zone",
    "roadHub": "Ferry to Home Island"
  }
} satisfies DestinationFacts
